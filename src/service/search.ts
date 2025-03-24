import { fetchResource } from './resource.ts';
import { Maniiifest } from 'maniiifest';
import { IIIFSearchSnippet } from '../types/index.ts'; // Adjust the import path
import { TamerlaneResourceError } from '../errors/index.ts';

/**
 * Fetch annotations and extract snippets.
 */
export async function searchAnnotations(
  targetUrl: string,
): Promise<IIIFSearchSnippet[]> {
  let snippets: IIIFSearchSnippet[] = [];
  let nextPageUrl: string | null = targetUrl;

  while (nextPageUrl) {
    const resource = await fetchResource(nextPageUrl);
    if (!resource.type || resource.type !== 'AnnotationPage') {
      throw new TamerlaneResourceError(
        `Invalid or empty response received from ${nextPageUrl}`,
      );
    }

    // **Step 1:** Build a lookup `Map` from the top-level annotations (items)
    const topParser = new Maniiifest(resource.data, 'AnnotationPage');
    const annotationLookup = new Map<string, any>(); // Map annotation ID → annotation object

    for (const annotation of topParser.iterateAnnotationPageAnnotation()) {
      annotationLookup.set(annotation.id, annotation);
    }

    console.log(`Built lookup Map with ${annotationLookup.size} annotations`);

    // **Step 2:** Iterate over `resource.data.annotations`
    for (const annotationPage of resource.data.annotations || []) {
      const nestedParser = new Maniiifest(annotationPage, 'AnnotationPage');

      for (const annotation of nestedParser.iterateAnnotationPageAnnotation()) {
        const snippet = buildSnippetFromAnnotation(
          annotation,
          annotationLookup,
        );
        if (snippet) snippets.push(snippet);
      }
    }

    console.log(`Fetched ${snippets.length} snippets so far...`);

    // Get the next page (if applicable)
    nextPageUrl = topParser.getAnnotationPage()?.next ?? null;
  }

  console.log(`Total IIIFSearchSnippet Retrieved: ${snippets.length}`);
  return snippets;
}

/**
 * Converts an annotation object to an IIIFSearchSnippet.
 */
function buildSnippetFromAnnotation(
  annotation: any,
  annotationLookup: Map<string, any>,
): IIIFSearchSnippet | null {
  if (!annotation || annotation.type !== 'Annotation') return null;

  // Try to find the original annotation from the lookup Map
  const baseAnnotation = annotationLookup.get(annotation.target?.source) || {};

  // Extract `canvasTarget` and `partOf`
  const canvasTarget: string =
    baseAnnotation.target?.id || annotation.target?.id || '';
  const partOf: string | undefined =
    baseAnnotation.target?.partOf?.id || annotation.target?.partOf?.id;

  // Extract snippet text (`TextQuoteSelector`)
  let prefix, exact, suffix;
  if (annotation.target.selector && Array.isArray(annotation.target.selector)) {
    const textSelector = annotation.target.selector.find(
      (sel: any) => sel.type === 'TextQuoteSelector',
    );
    if (textSelector) {
      prefix = textSelector.prefix;
      exact = textSelector.exact;
      suffix = textSelector.suffix;
    }
  }

  // Ensure a valid snippet
  if (!exact) return null;

  return {
    id: annotation.id,
    annotationId: baseAnnotation.id,
    motivation: annotation.motivation || '',
    prefix,
    exact,
    suffix,
    canvasTarget,
    partOf,
  };
}
