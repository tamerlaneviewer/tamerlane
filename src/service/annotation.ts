import { Maniiifest } from 'maniiifest';
import { fetchResource } from './resource.ts';
import { IIIFAnnotation } from '../types/index.ts';
import { TamerlaneResourceError } from '../errors/index.ts';

const manifestCache: Record<string, Maniiifest> = {}; // In-memory cache


async function processAnnotationsWorker(
  manifest: Maniiifest,
  targetUrl: string,
): Promise<IIIFAnnotation[]> {
  const resultsMap: Map<string, IIIFAnnotation> = new Map();

  for (const annotation of manifest.iterateAnnotationPageAnnotation()) {
    const id = annotation.id;
    const rawMotivation = annotation.motivation;
    const motivation = Array.isArray(rawMotivation) ? rawMotivation[0] : rawMotivation || '';

    const annotationParser = new Maniiifest(annotation, 'Annotation');

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
            body: Array.from(annotationParser.iterateAnnotationTextualBody()).map((bodyItem: any) => ({
              ...bodyItem,
              language:
                typeof bodyItem.language === 'object' &&
                  bodyItem.language !== null &&
                  'value' in bodyItem.language
                  ? bodyItem.language.value
                  : bodyItem.language,
            })),
          });
        }

        resultsMap.get(id)!.target.push(targetId);
      }
    }
  }

  return Array.from(resultsMap.values());
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
    );

    allAnnotations = allAnnotations.concat(result);

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
            result = await processAnnotationPage(annotationPage, targetUrl);
          } else if (typeof annotationPage.id === 'string') {
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

      return allAnnotations;
    }
  }

  console.warn(`No matching canvas found for target: ${targetUrl}`);
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
    if (typeof selector.value === 'string') {
      return selector.value.replace(/^#/, '');
    }

    if (selector.type === 'FragmentSelector' && typeof selector.value === 'string') {
      return selector.value;
    }

    if (selector.type === 'SvgSelector' && typeof selector.value === 'string') {
      return `svg=${encodeURIComponent(selector.value)}`;
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

