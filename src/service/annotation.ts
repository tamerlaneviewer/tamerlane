import { Maniiifest } from 'maniiifest';
import { fetchResource } from './resource.ts';
import { IIIFAnnotation } from '../types/index.ts';
import { TamerlaneResourceError} from '../errors/index.ts';

const manifestCache: Record<string, Maniiifest> = {}; // In-memory cache

async function processAnnotationsWorker(
  manifest: Maniiifest,
  targetUrl: string,
  iterateAnnotations: () => Iterable<any>,
): Promise<IIIFAnnotation[]> {
  const results: IIIFAnnotation[] = [];

  for (const annotation of iterateAnnotations.call(manifest)) {
    const { id, motivation } = annotation;
    const annotationParser = new Maniiifest(annotation, 'Annotation');

    for (const target of annotationParser.iterateAnnotationTarget()) {
      let targetId: string | null = null;

      if (typeof target === 'string') {
        targetId = target;
      } else if (target && typeof target === 'object') {
        if ('source' in target && typeof target.source === 'string') {
          targetId = target.source;
        } else if ('id' in target && typeof target.id === 'string') {
          targetId = target.id;
        }
      }

      if (targetId) {
        // Remove selector suffix from targetId (anything after #)
        const cleanTargetId = targetId.split('#')[0];

        if (cleanTargetId === targetUrl) {
          results.push({
            id,
            motivation,
            target: targetId, // Keep the full targetId in results
            body: Array.from(annotationParser.iterateAnnotationTextualBody()),
          });
        }
      }
    }
  }

  return results;
}

async function processAnnotations(
  parser: any,
  targetUrl: string,
): Promise<IIIFAnnotation[]> {
  let currentParser = parser;
  let allAnnotations: IIIFAnnotation[] = [];

  while (currentParser) {
    const result = await processAnnotationsWorker(
      currentParser,
      targetUrl,
      currentParser.iterateAnnotationPageAnnotation,
    );

    allAnnotations = allAnnotations.concat(result);

    // Move to the next annotation page if available
    const nextPageUrl = currentParser.getAnnotationPage().next;
    if (nextPageUrl) {
      const resource = await fetchResource(nextPageUrl);
      if (!resource.type || resource.type !== 'AnnotationPage') {
        throw new TamerlaneResourceError('No JSON data returned from fetchJson');
      }
      currentParser = new Maniiifest(resource.data, 'AnnotationPage');
    } else {
      currentParser = null;
    }
  }

  return allAnnotations;
}

async function processAnnotationPageRef(
  annotationPageUrl: string,
  targetUrl: string,
): Promise<IIIFAnnotation[]> {
  const resource = await fetchResource(annotationPageUrl);
  if (!resource.type || resource.type !== 'AnnotationPage') {
    throw new TamerlaneResourceError('No JSON data returned from fetchJson');
  }
  const parser = new Maniiifest(resource.data, 'AnnotationPage');
  return processAnnotations(parser, targetUrl);
}

async function processAnnotationPage(
  page: any,
  targetUrl: string,
): Promise<IIIFAnnotation[]> {
  const parser = new Maniiifest(page, 'AnnotationPage');
  return processAnnotations(parser, targetUrl);
}

export async function getAnnotationsForTarget(
  manifestUrl: string,
  targetUrl: string,
): Promise<IIIFAnnotation[]> {

  let parser: Maniiifest;

  if (manifestCache[manifestUrl]) {
    console.log(`🔄 Using cached manifest for: ${manifestUrl}`);
    parser = manifestCache[manifestUrl];
  } else {
    console.log(`📥 Fetching new manifest from: ${manifestUrl}`);
    const resource = await fetchResource(manifestUrl);
    if (!resource.type || resource.type !== 'Manifest') {
      throw new TamerlaneResourceError('No JSON data returned from fetchJson');
    }
    parser = new Maniiifest(resource.data);
    //Store in cache
    manifestCache[manifestUrl] = parser;
  }

  const type = parser.getSpecificationType();

  if (type !== 'Manifest') {
    throw new Error('Specification should be a Manifest');
  }

  let allAnnotations: IIIFAnnotation[] = [];

  for (const canvas of parser.iterateManifestCanvas()) {
    if (canvas.id === targetUrl) {
      console.log(`Processing canvas: ${canvas.id}`);

      const annotations = canvas.annotations;

      if (Array.isArray(annotations) && annotations.length > 0) {
        for (const annotationPage of annotations) {
          let result: IIIFAnnotation[] = [];
          if (Array.isArray(annotationPage.items)) {
            // Inline Annotation Page
            result = await processAnnotationPage(annotationPage, targetUrl);
          } else if (typeof annotationPage.id === 'string') {
            // Referenced Annotation Page
            result = await processAnnotationPageRef(
              annotationPage.id,
              targetUrl,
            );
          } else {
            console.warn(
              `Invalid annotation format in canvas ${canvas.id}:`,
              annotationPage,
            );
          }
          allAnnotations = allAnnotations.concat(result);
        }
      } else {
        console.warn(`Canvas ${canvas.id} has no valid annotations.`);
      }

      return allAnnotations; // Stop after processing the first matched canvas
    }
  }

  console.warn(`No matching canvas found for target: ${targetUrl}`);
  return [];
}

// Run the processManifest function and print the result
// (async () => {
//   const manifestUrl =
//     'https://iiif.wellcomecollection.org/presentation/b19974760_1_0014';
//   const canvasId =
//     'https://iiif.wellcomecollection.org/presentation/b19974760_1_0014/canvases/b19974760M0004_0006.jp2';

//   // const manifestUrl =
//   //   'https://iiif.io/api/cookbook/recipe/0266-full-canvas-annotation/manifest.json';
//   // const canvasId =
//   //   'https://iiif.io/api/cookbook/recipe/0266-full-canvas-annotation/canvas-1';

//   const manifestResult = await getAnnotationsForTarget(manifestUrl, canvasId);

//   // Print the final result
//   console.log(JSON.stringify(manifestResult, null, 2));
// })();
