import { Maniiifest } from 'maniiifest';
import { IIIFManifest, IIIFImage, IIIFCanvas } from '../types/index.ts';
import { TamerlaneParseError } from '../errors/index.ts';
import { fetchResource } from './resource.ts';
import { getImage } from './image.ts';

async function parseManifest(jsonData: any): Promise<IIIFManifest> {
  const parser = new Maniiifest(jsonData);
  const type = parser.getSpecificationType();
  if (type !== 'Manifest') {
    throw new TamerlaneParseError('Invalid IIIF resource type: ' + type);
  }

  const labelData: any = parser.getManifestLabelByLanguage('en');
  const label: string =
    labelData?.en?.[0] ?? labelData?.none?.[0] ?? 'Untitled Manifest';
  const metadata = Array.from(parser.iterateManifestMetadata());
  const provider = Array.from(parser.iterateManifestProvider());

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

  return {
    name: label,
    metadata,
    provider,
    canvases,
    images,
  };
}

async function parseCollection(jsonData: any): Promise<{
  firstManifest: IIIFManifest | null;
  manifestUrls: string[];
  total: number;
}> {
  const parser = new Maniiifest(jsonData);

  if (parser.getSpecificationType() !== 'Collection') {
    throw new TamerlaneParseError(
      'Invalid IIIF resource type: Collection expected',
    );
  }
  const manifestUrls: string[] = [];
  let firstManifest: IIIFManifest | null = null;

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
  return { firstManifest, manifestUrls, total: manifestUrls.length };
}

export async function constructManifests(url: string): Promise<{
  firstManifest: IIIFManifest | null;
  manifestUrls: string[];
  total: number;
}> {
  const resource = await fetchResource(url);

  if (resource.type === 'Manifest') {
    const parsedManifest = await parseManifest(resource.data);
    const manifestUrls = [url]; // Add the single manifest URL to the array
    return { firstManifest: parsedManifest, manifestUrls, total: 1 };
  } else if (resource.type === 'Collection') {
    const { firstManifest, manifestUrls, total } = await parseCollection(
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

    return { firstManifest, manifestUrls, total };
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
