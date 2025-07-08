import { Maniiifest } from 'maniiifest';
import {
  IIIFManifest,
  IIIFImage,
  IIIFCanvas,
  TamerlaneResource,
} from '../types/index.ts';
import { TamerlaneParseError } from '../errors/index.ts';
import { fetchResource } from './resource.ts';
import { getImage } from './image.ts';

async function parseManifest(jsonData: any): Promise<IIIFManifest> {
  const parser = new Maniiifest(jsonData);
  const type = parser.getSpecificationType();
  if (type !== 'Manifest') {
    throw new TamerlaneParseError('Invalid IIIF resource type: ' + type);
  }

  const labelData: any = parser.getManifestLabel();
  const label: string = Object.values(labelData)?.[0]?.[0] ?? 'Untitled manifest';
  const metadata = Array.from(parser.iterateManifestMetadata());
  const provider = Array.from(parser.iterateManifestProvider());
  const homepage = Array.from(parser.iterateManifestHomepage());
  console.log("homepage:", homepage);
  const requiredStatement: any = parser.getManifestRequiredStatement();

  const canvases: IIIFCanvas[] = [];
  for (const canvas of parser.iterateManifestCanvas()) {
    const id = canvas.id;
    const canvasHeight = canvas.height;
    const canvasWidth = canvas.width;
    canvases.push({ id, canvasWidth, canvasHeight });
  }

  const images: IIIFImage[] = [];
  for (const anno of parser.iterateManifestCanvasAnnotation()) {
    const annoParser = new Maniiifest(anno, 'Annotation');
    const targets = Array.from(annoParser.iterateAnnotationTarget());
    if (targets.length !== 1) {
      throw new TamerlaneParseError('Expected a single canvas target');
    }
    const canvasTarget = targets[0];
    if (typeof canvasTarget !== 'string') {
      throw new TamerlaneParseError('Expected canvas target to be a string');
    }

    for (const resourceBody of annoParser.iterateAnnotationResourceBody()) {
      const image = getImage(resourceBody, canvasTarget);
      images.push(image);
    }
  }

  let manifestSearch: { service: string; autocomplete?: string } | undefined;

  const service = parser.getManifestService();
  if (Array.isArray(service)) {
    const searchService = service.find((svc: any) => svc.type === 'SearchService2');

    if (searchService) {
      manifestSearch = {
        service: searchService.id,
        autocomplete: Array.isArray(searchService.service)
          ? searchService.service.find((s: any) => s.type === 'AutoCompleteService2')?.id
          : undefined,
      };
    }
  }

  return { info: { name: label, metadata, provider, homepage, requiredStatement }, canvases, images, manifestSearch };
}

async function parseCollection(jsonData: any): Promise<TamerlaneResource> {
  const parser = new Maniiifest(jsonData);

  if (parser.getSpecificationType() !== 'Collection') {
    throw new TamerlaneParseError(
      'Invalid IIIF resource type: Collection expected',
    );
  }
  const manifestUrls: string[] = [];
  let firstManifest: IIIFManifest | null = null;

  const labelData: any = parser.getCollectionLabel();
  const label: string = Object.values(labelData)?.[0]?.[0] ?? 'Untitled collection';
  // these will return the nested collections also so need to think how to best handle this 
  const metadata = Array.from(parser.iterateCollectionMetadata());
  const provider = Array.from(parser.iterateCollectionProvider());
  const homepage = Array.from(parser.iterateCollectionHomepage());
  const requiredStatement: any = parser.getCollectionRequiredStatement();

  let collectionSearch: { service: string; autocomplete?: string } | undefined;

  const service = parser.getCollectionService();
  if (Array.isArray(service)) {
    const searchService = service.find((svc: any) => svc.type === 'SearchService2');

    if (searchService) {
      collectionSearch = {
        service: searchService.id,
        autocomplete: Array.isArray(searchService.service)
          ? searchService.service.find((s: any) => s.type === 'AutoCompleteService2')?.id
          : undefined,
      };
    }
  }

  const collection = { info: { name: label, metadata, provider, homepage, requiredStatement }, collectionSearch };

  async function process(parsedJson: any, processedCollections: Set<string>) {
    if (processedCollections.has(parsedJson.id)) return;
    processedCollections.add(parsedJson.id);

    const parser = new Maniiifest(parsedJson);
    let foundManifests = false;

    for (const manifestItem of parser.iterateCollectionManifest()) {
      const manifestRef = new Maniiifest(manifestItem);
      const manifestId = manifestRef.getManifestId();

      if (manifestId) {
        manifestUrls.push(manifestId);
        foundManifests = true;

        if (!firstManifest) {
          const manifestResource = await fetchResource(manifestId);
          firstManifest = await parseManifest(manifestResource.data);
        }
      }
    }
    if (!foundManifests) {
      for (const collectionItem of parser.iterateCollectionCollection()) {
        if (collectionItem.items) {
          await process(collectionItem, processedCollections);
        } else {
          const nestedJson = await fetchResource(collectionItem.id);
          await process(nestedJson.data, processedCollections);
        }
      }
    }
  }

  await process(jsonData, new Set());

  return {
    firstManifest,
    manifestUrls,
    total: manifestUrls.length,
    collection,
  };
}

export async function parseResource(url: string): Promise<TamerlaneResource> {
  const resource = await fetchResource(url);

  if (resource.type === 'Manifest') {
    const parsedManifest = await parseManifest(resource.data);
    const manifestUrls = [url]; // Add the single manifest URL to the array
    return { firstManifest: parsedManifest, manifestUrls, total: 1 };
  } else if (resource.type === 'Collection') {
    const { firstManifest, manifestUrls, total, collection } = await parseCollection(
      resource.data,
    );

    if (manifestUrls.length === 0) {
      return { firstManifest: null, manifestUrls: [], total: 0 };
    }

    if (!firstManifest && manifestUrls.length > 0) {
      const firstFetchedManifest = await fetchResource(manifestUrls[0]);
      const parsedManifest = await parseManifest(firstFetchedManifest.data);
      return { firstManifest: parsedManifest, manifestUrls, total };
    }

    return { firstManifest, manifestUrls, total, collection };
  }

  throw new TamerlaneParseError('Unknown IIIF resource type');
}

// constructManifests("https://iiif.io/api/cookbook/recipe/0266-full-canvas-annotation/manifest.json")
//     .then(manifest => console.log(JSON.stringify(manifest, null, 2))) // Pretty-print JSON
//     .catch(console.error);

// constructManifests(
//   'https://iiif.wellcomecollection.org/presentation/b19974760_1_0007',
// )
//   .then((manifest) => console.log(JSON.stringify(manifest, null, 2))) // Pretty-print JSON
//   .catch(console.error);
