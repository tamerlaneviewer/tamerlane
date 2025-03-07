import { IIIFResource } from '../types/index.ts';
import { TamerlaneResourceError } from '../errors/index.ts';

export async function fetchResource(url: string): Promise<IIIFResource> {
  try {
      const response = await fetch(url);
      if (!response.ok) {
          throw new TamerlaneResourceError(`HTTP error! status: ${response.status}`);
      }
      const data: any = await response.json();
      if (data.type !== "Manifest" && data.type !== "Collection" && data.type !== "AnnotationPage") {
          throw new Error(`Invalid IIIF resource type: ${data.type}`);
      }
      return { type: data.type, data };
  } catch (error) {
      console.error('Error fetching IIIF resource:', error);
      throw new Error('Error fetching IIIF resource');
  }
}