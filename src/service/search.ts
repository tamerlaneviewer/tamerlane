import { fetchResource } from './resource.ts';
import { Maniiifest } from 'maniiifest';
import { IIIFSearchSnippet } from '../types/index.ts'; // Adjust the import path
import { TamerlaneResourceError } from '../errors/index.ts';
import { maxSearchPages } from '../config/appConfig.ts'; // Import the max pages limit

/**
 * Fetch annotations and extract snippets.
 */
export async function searchAnnotations(
  targetUrl: string,
): Promise<IIIFSearchSnippet[]> {
  let snippets: IIIFSearchSnippet[] = [];
  let nextPageUrl: string | null = targetUrl;
  let pageCount = 0;
  const MAX_PAGES = maxSearchPages || 10;

  while (nextPageUrl && pageCount < MAX_PAGES) {
    const resource = await fetchResource(nextPageUrl);
    if (resource.data.type !== 'AnnotationPage') {
      throw new TamerlaneResourceError(
        `Invalid or empty response received from ${nextPageUrl}`,
      );
    }

    const annotationLookup = new Map<string, any>();
    const hits: any[] = [];

    // First Pass: Build lookup map from top-level items (base annotations with geometry)
    if (resource.data.items && Array.isArray(resource.data.items)) {
      for (const annotation of resource.data.items) {
        if (annotation.id) {
          annotationLookup.set(annotation.id, annotation);
        }
      }
    }

    // Second Pass: Collect search hits from nested annotation pages
    for (const annotationPage of resource.data.annotations || []) {
      const nestedParser = new Maniiifest(annotationPage, 'AnnotationPage');
      for (const annotation of nestedParser.iterateAnnotationPageAnnotation()) {
        // Add nested annotations to lookup as well (in case they're referenced)
        if (annotation.id) {
          annotationLookup.set(annotation.id, annotation);
        }
        // A "hit" is an annotation with motivation "highlighting"
        const motivation = annotation.motivation;
        let isHighlighting = false;

        if (typeof motivation === 'string') {
          isHighlighting = (motivation as string).includes('highlighting');
        } else if (Array.isArray(motivation)) {
          isHighlighting = motivation.some(m => String(m).includes('highlighting'));
        } else if (motivation) {
          // Handle other types by converting to string
          isHighlighting = String(motivation).includes('highlighting');
        }

        if (isHighlighting) {
          hits.push(annotation);
        }
      }
    }

    // Second Pass: Build snippets from the collected hits.
    for (const hit of hits) {
      const snippet = buildSnippetFromAnnotation(hit, annotationLookup);
      if (snippet) {
        snippets.push(snippet);
      }
    }

    // Get the next page (if applicable)
    const mainParser = new Maniiifest(resource.data, 'AnnotationPage');
    nextPageUrl = mainParser.getAnnotationPage()?.next ?? null;
    pageCount++;
  }

  return snippets;
}

/**
 * Converts a "hit" annotation object to an IIIFSearchSnippet.
 */
function buildSnippetFromAnnotation(
  hitAnnotation: any,
  annotationLookup: Map<string, any>,
): IIIFSearchSnippet | null {
  if (!hitAnnotation?.target || hitAnnotation.type !== 'Annotation') return null;

  // The hit's target source is the ID of the base annotation with the geometry.
  const baseAnnotationId = hitAnnotation.target.source;
  if (typeof baseAnnotationId !== 'string') {
    console.warn('Search hit has no target source string.', hitAnnotation);
    return null;
  }

  const baseAnnotation = annotationLookup.get(baseAnnotationId);
  if (!baseAnnotation) {
    console.warn(
      `Could not find base annotation with ID: ${baseAnnotationId} in the lookup map.`,
    );
    return null;
  }

  // --- Extract data primarily from the base annotation ---

  const baseTarget = baseAnnotation.target;
  let canvasTarget = '';

  if (typeof baseTarget === 'string') {
    canvasTarget = baseTarget;
  } else if (baseTarget?.id) {
    canvasTarget = baseTarget.id;
  } else if (baseTarget?.source) {
    canvasTarget =
      typeof baseTarget.source === 'string'
        ? baseTarget.source
        : baseTarget.source.id;
  }

  const cleanCanvasTarget = canvasTarget.split('#')[0];
  if (!cleanCanvasTarget) {
    console.warn(
      'Could not determine canvasTarget from base annotation:',
      baseAnnotation,
    );
    return null;
  }

  const partOf = getPartOf(baseTarget);

  // --- Extract text snippet from the "hit" annotation ---

  let prefix, exact, suffix;
  const hitSelector = hitAnnotation.target.selector;
  if (hitSelector && Array.isArray(hitSelector)) {
    const textSelector = hitSelector.find(
      (sel: any) => sel.type === 'TextQuoteSelector',
    );
    if (textSelector) {
      prefix = textSelector.prefix;
      exact = textSelector.exact;
      suffix = textSelector.suffix;
    }
  } else if (hitSelector?.type === 'TextQuoteSelector') {
    prefix = hitSelector.prefix;
    exact = hitSelector.exact;
    suffix = hitSelector.suffix;
  }

  if (!exact) {
    console.warn('Could not find TextQuoteSelector on hit:', hitAnnotation);
    return null;
  }

  // Extract motivation as string for the snippet
  let motivationString = '';
  if (typeof hitAnnotation.motivation === 'string') {
    motivationString = hitAnnotation.motivation;
  } else if (Array.isArray(hitAnnotation.motivation)) {
    motivationString = hitAnnotation.motivation.join(', ');
  } else if (hitAnnotation.motivation) {
    motivationString = String(hitAnnotation.motivation);
  }

  return {
    id: hitAnnotation.id,
    annotationId: baseAnnotation.id,
    motivation: motivationString,
    prefix,
    exact,
    suffix,
    canvasTarget: cleanCanvasTarget,
    partOf,
    language: hitAnnotation.target.language || undefined,
  };
}

/**
 * Recursively finds the manifest ID from a `partOf` property.
 */
function getPartOf(target: any): string | undefined {
  if (!target || typeof target !== 'object') return undefined;

  if (target.partOf) {
    if (typeof target.partOf === 'string') {
      return target.partOf;
    }
    if (typeof target.partOf.id === 'string') {
      return target.partOf.id;
    }
    if (Array.isArray(target.partOf)) {
      for (const p of target.partOf) {
        if (typeof p === 'string') return p;
        if (typeof p.id === 'string') return p.id;
      }
    }
  }

  if (target.source) {
    return getPartOf(target.source);
  }

  return undefined;
}
