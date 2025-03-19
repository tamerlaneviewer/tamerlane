import { fetchResource } from './resource.ts';
import { Maniiifest } from 'maniiifest';
import { IIIFAnnotation } from '../types/index.ts';
import { TamerlaneResourceError } from '../errors/index.ts';

export async function searchAnnotations(
  targetUrl: string,
): Promise<IIIFAnnotation[]> {
  let annotations: IIIFAnnotation[] = [];
  let nextPageUrl: string | null = targetUrl;

  while (nextPageUrl) {
    const resource = await fetchResource(nextPageUrl);
    if (!resource.type || resource.type !== 'AnnotationPage') {
      throw new TamerlaneResourceError(
        `Invalid or empty response received from ${nextPageUrl}`,
      );
    }
    if (resource.data.annotations && Array.isArray(resource.data.annotations)) {
      for (const annotationPage of resource.data.annotations) {
        const parser = new Maniiifest(annotationPage, 'AnnotationPage');
        for (const annotation of parser.iterateAnnotationPageAnnotation()) {
          annotations.push(annotation as any);
        }
        console.log(`Fetched ${annotations.length} annotations so far...`);
        // Get next page if available
        nextPageUrl = parser.getAnnotationPage()?.next ?? null;
      }
    }
  }
  return annotations;
}
