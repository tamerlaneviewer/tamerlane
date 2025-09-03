import { fetchResource } from './resource.ts';
import { Maniiifest } from 'maniiifest';
import { IIIFSearchSnippet } from '../types/index.ts'; // Adjust the import path
import { maxSearchPages } from '../config/appConfig.ts'; // Import the max pages limit
import { createError } from '../errors/structured.ts';
import { logger } from '../utils/logger.ts';

/**
 * Fetch annotations and extract snippets.
 */
export async function searchAnnotations(
  targetUrl: string,
  signal?: AbortSignal,
): Promise<IIIFSearchSnippet[]> {
  let snippets: IIIFSearchSnippet[] = [];
  let nextPageUrl: string | null = targetUrl;
  let pageCount = 0;
  const MAX_PAGES = maxSearchPages || 10;
  const annotationLookup = new Map<string, any>();
  const hits: any[] = [];

  while (nextPageUrl && pageCount < MAX_PAGES) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const resource = await fetchResource(nextPageUrl, { signal });
    if (resource.data.type !== 'AnnotationPage') {
      throw createError(
        'NETWORK_SEARCH_FETCH',
        `Invalid or empty response received from ${nextPageUrl}`,
        { cause: resource, recoverable: true }
      );
    }

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
        // A "hit" is an annotation with motivation "highlighting" or "contextualizing"
        // Per IIIF Content Search 2.0 spec: only exact matching for these motivations
        const motivation = annotation.motivation;
        let isSearchResult = false;

        if (typeof motivation === 'string') {
          isSearchResult = motivation === 'highlighting' || motivation === 'contextualizing';
        } else if (Array.isArray(motivation)) {
          isSearchResult = motivation.some(m => {
            const motStr = String(m);
            return motStr === 'highlighting' || motStr === 'contextualizing';
          });
        }

        if (isSearchResult) {
          hits.push(annotation);
        }
      }
    }

    // Get the next page (if applicable)
    const mainParser = new Maniiifest(resource.data, 'AnnotationPage');
    nextPageUrl = mainParser.getAnnotationPage()?.next ?? null;
    pageCount++;
  }

  // Build snippets from all collected hits after processing all pages
  for (const hit of hits) {
    const snippets_from_hit = buildSnippetsFromAnnotation(hit, annotationLookup);
    snippets.push(...snippets_from_hit);
  }

  return snippets;
}

/**
 * Converts a search result annotation to one or more IIIFSearchSnippets.
 * Handles both single targets and array targets.
 */
function buildSnippetsFromAnnotation(
  hitAnnotation: any,
  annotationLookup: Map<string, any>,
): IIIFSearchSnippet[] {
  if (!hitAnnotation?.target || hitAnnotation.type !== 'Annotation') return [];

  // Handle array targets - create multiple snippets
  if (Array.isArray(hitAnnotation.target)) {
    const snippets: IIIFSearchSnippet[] = [];
    for (let i = 0; i < hitAnnotation.target.length; i++) {
      const snippet = buildSnippetFromSingleTarget(hitAnnotation, hitAnnotation.target[i], annotationLookup, i);
      if (snippet) {
        snippets.push(snippet);
      }
    }
    return snippets;
  }

  // Handle single target
  const snippet = buildSnippetFromSingleTarget(hitAnnotation, hitAnnotation.target, annotationLookup, 0);
  return snippet ? [snippet] : [];
}

/**
 * Converts a single target from a search result annotation to an IIIFSearchSnippet.
 */
function buildSnippetFromSingleTarget(
  hitAnnotation: any,
  targetObj: any,
  annotationLookup: Map<string, any>,
  targetIndex: number = 0,
): IIIFSearchSnippet | null {
  // The hit's target source is the ID of the base annotation with the geometry.
  const baseAnnotationId = targetObj.source;
  if (typeof baseAnnotationId !== 'string') {
    logger.warn('Search hit has no target source string.', hitAnnotation);
    return null;
  }

  const baseAnnotation = annotationLookup.get(baseAnnotationId);
  if (!baseAnnotation) {
    logger.warn(
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
    logger.warn(
      'Could not determine canvasTarget from base annotation:',
      baseAnnotation,
    );
    return null;
  }

  const partOf = getPartOf(baseTarget);

  // --- Extract text snippet from the search result annotation ---

  let prefix, exact, suffix;
  const hitSelector = targetObj.selector;
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
    logger.warn('Could not find TextQuoteSelector on search result target:', targetObj);
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

  // Create unique ID for multiple targets
  const snippetId = targetIndex > 0 ? `${hitAnnotation.id}-${targetIndex}` : hitAnnotation.id;

  return {
    id: snippetId,
    annotationId: baseAnnotation.id,
    motivation: motivationString,
    prefix,
    exact,
    suffix,
    canvasTarget: cleanCanvasTarget,
    partOf,
    language: targetObj.language || undefined,
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
