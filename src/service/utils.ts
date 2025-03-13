import { IIIFResource } from '../types/index.ts';
import { TamerlaneResourceError } from '../errors/index.ts';

const resourceCache = new Map<string, IIIFResource>(); // Caching fetched resources

export async function fetchResource(url: string): Promise<IIIFResource> {
  // Check if the resource is already in the cache
  if (resourceCache.has(url)) {
    return resourceCache.get(url)!;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new TamerlaneResourceError(
        `HTTP error! status: ${response.status}`,
      );
    }
    const data: any = await response.json();
    if (
      data.type !== 'Manifest' &&
      data.type !== 'Collection' &&
      data.type !== 'AnnotationPage'
    ) {
      throw new Error(`Invalid IIIF resource type: ${data.type}`);
    }

    const resource: IIIFResource = { type: data.type, data };
    // Store the fetched resource in the cache
    resourceCache.set(url, resource);
    return resource;
  } catch (error) {
    console.error('Error fetching IIIF resource:', error);
    throw new Error('Error fetching IIIF resource');
  }
}
