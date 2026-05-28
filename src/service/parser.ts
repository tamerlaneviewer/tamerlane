import { Maniiifest } from 'maniiifest';
import type {
  Range as ManiiifestRange,
  RangeItems as ManiiifestRangeItem,
} from 'maniiifest/dist/iiif-types';
import {
  IIIFManifest,
  IIIFImage,
  IIIFCanvas,
  CanvasSequence,
  TamerlaneResource,
} from '../types/index.ts';
import { createError } from '../errors/structured.ts';
import { fetchResource } from './resource.ts';
import { getImage } from './image.ts';
import { logger } from '../utils/logger.ts';

type SearchServiceRef = { service: string; autocomplete?: string };

function extractSearchService(service: any): SearchServiceRef | undefined {
  if (!Array.isArray(service)) return undefined;
  const searchService: any = service.find(
    (svc: any) => svc?.type === 'SearchService2',
  );
  if (!searchService) return undefined;
  return {
    service: searchService.id,
    autocomplete: Array.isArray(searchService.service)
      ? searchService.service.find((s: any) => s?.type === 'AutoCompleteService2')?.id
      : undefined,
  };
}

function pickLabel(labelData: any): string | undefined {
  const first = (Object.values(labelData ?? {}) as any[])?.[0]?.[0];
  return typeof first === 'string' ? first : undefined;
}

function stripFragment(uri: string): string {
  const hash = uri.indexOf('#');
  return hash === -1 ? uri : uri.slice(0, hash);
}

// Walk a Range's `items` depth-first, collecting canvas ids in order.
// Canvas items contribute their id (fragment stripped); SpecificResource
// items contribute their `source` (canvas with selector). Sub-ranges
// recurse. Anything else is ignored.
function flattenRangeCanvases(range: ManiiifestRange, out: string[]): void {
  const items = Array.isArray(range?.items) ? range.items : [];
  for (const item of items as ManiiifestRangeItem[]) {
    if (!item || typeof item !== 'object') continue;
    if (item.type === 'Canvas' && typeof item.id === 'string') {
      out.push(stripFragment(item.id));
    } else if (item.type === 'SpecificResource') {
      const src: any = (item as any).source;
      const source = typeof src === 'string' ? src : src?.id;
      if (typeof source === 'string') out.push(stripFragment(source));
    } else if (item.type === 'Range') {
      flattenRangeCanvases(item as ManiiifestRange, out);
    }
  }
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Per IIIF Presentation 3.0, Range is primarily a structural construct
// (table of contents). A Range may only be used as an alternate reading
// order when it explicitly opts in with `behavior: ["sequence"]`. Without
// that opt-in, structural ranges like "Cover" or "Chapter 1" must not
// replace the default canvas order — doing so collapses navigation to a
// section of the manifest.
function extractRanges(
  parser: Maniiifest,
  defaultOrder: string[],
): CanvasSequence[] {
  const sequences: CanvasSequence[] = [];
  for (const range of parser.iterateManifestRange()) {
    if (typeof range.id !== 'string') continue;
    const behavior = range.behavior;
    if (!Array.isArray(behavior) || !behavior.includes('sequence')) continue;
    const canvasIds: string[] = [];
    flattenRangeCanvases(range, canvasIds);
    if (canvasIds.length === 0) continue;
    if (arraysEqual(canvasIds, defaultOrder)) continue; // adds no nav value
    sequences.push({
      id: range.id,
      label: pickLabel(range.label),
      canvasIds,
    });
  }
  return sequences;
}

async function parseManifest(jsonData: any): Promise<IIIFManifest> {
  const parser = new Maniiifest(jsonData);
  const type = parser.getSpecificationType();
  if (type !== 'Manifest') {
    throw createError('PARSING_MANIFEST', 'Invalid IIIF resource type: ' + type, {
      recoverable: false,
    });
  }

  const label = pickLabel(parser.getManifestLabel()) ?? 'Untitled manifest';
  const metadata = Array.from(parser.iterateManifestMetadata());
  const provider = Array.from(parser.iterateManifestProvider());
  const homepage = Array.from(parser.iterateManifestHomepage());
  logger.debug('homepage:', homepage);
  const requiredStatement: any = parser.getManifestRequiredStatement();

  const canvases: IIIFCanvas[] = [];
  for (const canvas of parser.iterateManifestCanvas()) {
    canvases.push({
      id: canvas.id,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    });
  }

  const images: IIIFImage[] = [];
  for (const anno of parser.iterateManifestCanvasAnnotation()) {
    const motivation = Array.isArray((anno as any).motivation)
      ? (anno as any).motivation[0]
      : (anno as any).motivation;
    if (motivation && motivation !== 'painting') continue;

    const annoParser = Maniiifest.parseAnnotation(anno);
    const targets = Array.from(annoParser.iterateAnnotationTarget());
    if (targets.length !== 1) {
      throw createError('PARSING_MANIFEST', 'Expected a single canvas target');
    }
    const canvasTarget = targets[0];
    if (typeof canvasTarget !== 'string') {
      throw createError('PARSING_MANIFEST', 'Expected canvas target to be a string');
    }
    for (const resourceBody of annoParser.iterateAnnotationResourceBody()) {
      try {
        images.push(getImage(resourceBody, canvasTarget));
      } catch (error) {
        logger.debug('Skipping non-image annotation body while parsing manifest', error);
      }
    }
  }

  const manifestSearch = extractSearchService(parser.getManifestService());
  const ranges = extractRanges(parser, canvases.map((c) => c.id));

  return {
    info: { name: label, metadata, provider, homepage, requiredStatement },
    canvases,
    images,
    manifestSearch,
    ranges: ranges.length > 0 ? ranges : undefined,
  };
}

// Depth-first traversal of a Collection tree, collecting every Manifest
// reference in document order. Visits both Manifest and sub-Collection
// items at every level (Presentation 3.0 allows them to be mixed).
// Sub-Collection entries must be references per spec; we fetch when
// items are absent, and recurse inline when they are present (logging
// a debug note for the non-conformant case).
async function collectManifestUrls(rootJson: any, rootUrl: string): Promise<string[]> {
  const manifestUrls: string[] = [];
  const seenManifests = new Set<string>();
  const visitedCollections = new Set<string>();
  if (rootUrl) visitedCollections.add(rootUrl);

  async function walk(json: any): Promise<void> {
    // Walk `items` directly to preserve document order across mixed
    // Manifest / Collection siblings; Maniiifest's typed iterators
    // group by item type and would not preserve interleaving.
    const items: any[] = Array.isArray(json?.items) ? json.items : [];
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      if (item.type === 'Manifest') {
        const manifestId =
          typeof item.id === 'string' ? item.id : new Maniiifest(item).getManifestId();
        if (manifestId && !seenManifests.has(manifestId)) {
          seenManifests.add(manifestId);
          manifestUrls.push(manifestId);
        }
      } else if (item.type === 'Collection') {
        const itemId: string | undefined =
          typeof item.id === 'string' ? item.id : undefined;
        if (Array.isArray(item.items)) {
          logger.debug('Nested Collection with inline items (non-conformant in P3):', itemId);
          // Cycle protection only applies when we have an id to track.
          if (itemId) {
            if (visitedCollections.has(itemId)) continue;
            visitedCollections.add(itemId);
          }
          await walk(item);
        } else if (itemId) {
          if (visitedCollections.has(itemId)) continue;
          visitedCollections.add(itemId);
          try {
            const nested = await fetchResource(itemId);
            await walk(nested.data);
          } catch (err) {
            logger.debug('Failed to fetch nested collection', itemId, err);
          }
        }
      }
    }
  }

  await walk(rootJson);
  return manifestUrls;
}

async function parseCollection(
  jsonData: any,
  rootUrl: string,
): Promise<{
  manifestUrls: string[];
  total: number;
  collection: NonNullable<TamerlaneResource['collection']>;
}> {
  const parser = new Maniiifest(jsonData);
  if (parser.getSpecificationType() !== 'Collection') {
    throw createError('PARSING_MANIFEST', 'Invalid IIIF resource type: Collection expected');
  }

  const label = pickLabel(parser.getCollectionLabel()) ?? 'Untitled collection';
  const metadata = Array.from(parser.iterateCollectionMetadata());
  const provider = Array.from(parser.iterateCollectionProvider());
  const homepage = Array.from(parser.iterateCollectionHomepage());
  const requiredStatement: any = parser.getCollectionRequiredStatement();
  const collectionSearch = extractSearchService(parser.getCollectionService());

  const manifestUrls = await collectManifestUrls(jsonData, rootUrl);

  return {
    manifestUrls,
    total: manifestUrls.length,
    collection: {
      id: rootUrl,
      info: { name: label, metadata, provider, homepage, requiredStatement },
      collectionSearch,
    },
  };
}

export async function parseResource(url: string): Promise<TamerlaneResource> {
  const resource = await fetchResource(url);

  if (resource.type === 'Manifest') {
    const parsedManifest = await parseManifest(resource.data);
    return { firstManifest: parsedManifest, manifestUrls: [url], total: 1 };
  }

  if (resource.type === 'Collection') {
    const { manifestUrls, total, collection } = await parseCollection(resource.data, url);

    if (manifestUrls.length === 0) {
      return { firstManifest: null, manifestUrls: [], total: 0, collection };
    }

    const firstFetched = await fetchResource(manifestUrls[0]);
    const firstManifest = await parseManifest(firstFetched.data);
    return { firstManifest, manifestUrls, total, collection };
  }

  throw createError('PARSING_MANIFEST', 'Unknown IIIF resource type');
}
