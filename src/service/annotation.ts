import { Maniiifest, ManiiifestAnnotationPage } from 'maniiifest';
import { fetchResource } from './resource.ts';
import { createError } from '../errors/structured.ts';
import { IIIFAnnotation } from '../types/index.ts';
import { logger } from '../utils/logger.ts';
import { maxAnnotationPages } from '../config/appConfig.ts';
import {
  PointTransform,
  identityTransform,
  geoFeaturesToSvgTarget,
} from './geojson.ts';
import { extractCanvasGcps, createGeoToResourceTransform } from './georeference.ts';

const manifestCache: Record<string, Maniiifest> = {}; // In-memory cache


async function processAnnotationsWorker(
  manifest: ManiiifestAnnotationPage,
  targetUrl: string,
  transform: PointTransform = identityTransform,
): Promise<IIIFAnnotation[]> {
  const resultsMap: Map<string, IIIFAnnotation> = new Map();

  for (const annotation of manifest.iterateAnnotationPageAnnotation()) {
    const id = annotation.id;
    const rawMotivation = annotation.motivation;
    const motivation = Array.isArray(rawMotivation) ? rawMotivation[0] : rawMotivation || '';

    const annotationParser = Maniiifest.parseAnnotation(annotation);

    const body = Array.from(annotationParser.iterateAnnotationTextualBody()).map((bodyItem: any) => ({
      ...bodyItem,
      language:
        typeof bodyItem.language === 'object' &&
          bodyItem.language !== null &&
          'value' in bodyItem.language
          ? bodyItem.language.value
          : bodyItem.language,
    }));

    // GeoJSON `Feature` / `FeatureCollection` targets carry geographic geometry
    // instead of a canvas fragment. Render them as an SVG overlay (in resource
    // space, applying any canvas georeference transform) on the current canvas.
    const targetFeatures = Array.from(annotationParser.iterateAnnotationTargetFeature());
    if (targetFeatures.length > 0) {
      const svgTarget = geoFeaturesToSvgTarget(targetFeatures, targetUrl, transform);
      if (svgTarget) {
        resultsMap.set(id, {
          id,
          motivation,
          target: [svgTarget],
          generator: (annotation as any).generator,
          body,
        });
      }
      continue;
    }

    for (const target of annotationParser.iterateAnnotationTarget()) {
      const normalizedTargets = normalizeAnnotationTargets(target);

      for (const targetId of normalizedTargets) {
        const cleanTargetId = targetId.split('#')[0];
        if (cleanTargetId !== targetUrl) continue;

        if (!resultsMap.has(id)) {
          resultsMap.set(id, {
            id,
            motivation,
            target: [],
            generator: (annotation as any).generator,
            body,
          });
        }

        resultsMap.get(id)!.target.push(targetId);
      }
    }
  }

  return Array.from(resultsMap.values());
}


async function processAnnotations(
  rawPage: any,
  targetUrl: string,
  transform: PointTransform = identityTransform,
  signal?: AbortSignal,
): Promise<IIIFAnnotation[]> {
  let currentPage: any = rawPage;
  let allAnnotations: IIIFAnnotation[] = [];
  const visited = new Set<string>();
  let pageCount = 0;

  while (currentPage) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    // maniiifest parses GeoJSON `Feature` targets natively; the worker converts
    // them to SVG overlays via the supplied transform.
    const parser = Maniiifest.parseAnnotationPage(currentPage);
    const result = await processAnnotationsWorker(parser, targetUrl, transform);
    allAnnotations = allAnnotations.concat(result);

    const nextPage = (parser.getAnnotationPage()?.next ?? currentPage?.next) as any;
    const nextPageUrl = typeof nextPage === 'string' ? nextPage : nextPage?.id;
    pageCount += 1;
    if (nextPageUrl && pageCount >= maxAnnotationPages) {
      logger.warn(
        `Annotation pagination cap reached (${maxAnnotationPages}); stopping at ${nextPageUrl}`,
      );
      break;
    }
    if (nextPageUrl && visited.has(nextPageUrl)) {
      logger.warn(`Annotation pagination cycle detected at ${nextPageUrl}`);
      break;
    }
    if (nextPageUrl) {
      visited.add(nextPageUrl);
      const resource = await fetchResource(nextPageUrl, { signal });
      if (!resource.type || resource.type !== 'AnnotationPage') {
        throw createError('NETWORK_ANNOTATION_FETCH', 'No JSON data returned from fetchJson', { cause: resource });
      }
      currentPage = resource.data;
    } else {
      currentPage = null;
    }
  }

  return allAnnotations;
}



async function processAnnotationPageRef(
  annotationPageUrl: string,
  targetUrl: string,
  transform: PointTransform = identityTransform,
  signal?: AbortSignal,
): Promise<IIIFAnnotation[]> {
  const resource = await fetchResource(annotationPageUrl, { signal });
  if (!resource.type || resource.type !== 'AnnotationPage') {
    throw createError('NETWORK_ANNOTATION_FETCH', 'No JSON data returned from fetchJson', { cause: resource });
  }
  return processAnnotations(resource.data, targetUrl, transform, signal);
}

async function processAnnotationPage(
  page: any,
  targetUrl: string,
  transform: PointTransform = identityTransform,
  signal?: AbortSignal,
): Promise<IIIFAnnotation[]> {
  return processAnnotations(page, targetUrl, transform, signal);
}

export async function getAnnotationsForTarget(
  manifestUrl: string,
  targetUrl: string,
  signal?: AbortSignal,
): Promise<IIIFAnnotation[]> {
  let parser: Maniiifest;

  if (manifestCache[manifestUrl]) {
    logger.debug(`Using cached manifest for: ${manifestUrl}`);
    parser = manifestCache[manifestUrl];
  } else {
    logger.info(`Fetching new manifest from: ${manifestUrl}`);
  const resource = await fetchResource(manifestUrl, { signal });
    if (!resource.type || resource.type !== 'Manifest') {
      throw createError('NETWORK_MANIFEST_FETCH', 'No JSON data returned from fetchJson', { cause: resource });
    }
    parser = new Maniiifest(resource.data);
    manifestCache[manifestUrl] = parser;
  }

  const type = parser.getSpecificationType();

  if (type !== 'Manifest') {
    throw new Error('Specification should be a Manifest');
  }

  let allAnnotations: IIIFAnnotation[] = [];

  for (const canvas of parser.iterateManifestCanvas()) {
    if (canvas.id === targetUrl) {
      logger.debug(`Processing canvas: ${canvas.id}`);

      // Build a geo -> resource transform from any canvas-level georeference
      // control points so GeoJSON targets can be rendered in image space.
      const gcps = extractCanvasGcps(canvas);
      const transform = gcps
        ? await createGeoToResourceTransform(gcps)
        : identityTransform;

      const annotations = canvas.annotations;

      if (Array.isArray(annotations) && annotations.length > 0) {
        for (const annotationPage of annotations) {
          let result: IIIFAnnotation[] = [];
          if (Array.isArray(annotationPage.items)) {
            result = await processAnnotationPage(annotationPage, targetUrl, transform, signal);
          } else if (typeof annotationPage.id === 'string') {
            result = await processAnnotationPageRef(
              annotationPage.id,
              targetUrl,
              transform,
              signal,
            );
          } else {
            logger.warn(
              `Invalid annotation format in canvas ${canvas.id}:`,
              annotationPage,
            );
          }
          allAnnotations = allAnnotations.concat(result);
        }
      } else {
        logger.warn(`Canvas ${canvas.id} has no valid annotations.`);
      }

      return allAnnotations;
    }
  }

  logger.warn(`No matching canvas found for target: ${targetUrl}`);
  return [];
}

export function normalizeAnnotationTargets(target: any): string[] {
  const results: string[] = [];

  const flattenTarget = (t: any): void => {
    if (typeof t === 'string') {
      results.push(t);
    } else if (Array.isArray(t)) {
      t.forEach(flattenTarget);
    } else if (t && typeof t === 'object') {
      // Priority 1: use `id` if present
      if (typeof t.id === 'string') {
        results.push(t.id);
        return;
      }

      // Priority 2: handle `source` + optional `selector`
      const source = typeof t.source === 'string'
        ? t.source
        : typeof t.source?.id === 'string'
          ? t.source.id
          : null;

      if (source) {
        const selectorStr = extractSelector(t.selector);
        if (selectorStr) {
          results.push(`${source}#${selectorStr}`);
        } else {
          results.push(source);
        }
        return;
      }

      // Fallback: if none of the above work, check `value`
      if (typeof t.value === 'string') {
        results.push(t.value);
      }
    }
  };

  flattenTarget(target);
  return results;
}


function extractSelector(selector: any): string | null {
  if (!selector) return null;

  if (typeof selector === 'string') {
    return selector.replace(/^#/, '');
  }

  if (Array.isArray(selector)) {
    for (const sel of selector) {
      const extracted = extractSelector(sel);
      if (extracted) return extracted;
    }
    return null;
  }

  if (typeof selector === 'object') {
    if (selector.type === 'SvgSelector' && typeof selector.value === 'string') {
      return `svg=${encodeURIComponent(selector.value)}`;
    }

    if (typeof selector.value === 'string') {
      return selector.value.replace(/^#/, '');
    }

    if (selector.type === 'FragmentSelector' && typeof selector.value === 'string') {
      return selector.value;
    }

    if (selector.type === 'TextQuoteSelector') {
      const exact = selector.exact || '';
      const prefix = selector.prefix || '';
      const suffix = selector.suffix || '';
      return `text=${encodeURIComponent(prefix)}${encodeURIComponent(exact)}${encodeURIComponent(suffix)}`;
    }

    if (selector.region) {
      return `xywh=${selector.region}`;
    }
  }

  return null;
}

