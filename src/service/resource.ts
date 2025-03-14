import { IIIFResource } from '../types/index.ts';
import { TamerlaneResourceError } from '../errors/index.ts';

const CACHE_TIMEOUT = 1 * 60 * 1000; // 1 minutes
const resourceCache = new Map<
  string,
  { resource: IIIFResource; timestamp: number }
>(); // Cache with timestamps

export async function fetchResource(url: string): Promise<IIIFResource> {
  const currentTime = Date.now();
  // Check if the resource is in cache and still valid
  if (resourceCache.has(url)) {
    const cachedEntry = resourceCache.get(url)!;

    if (currentTime - cachedEntry.timestamp < CACHE_TIMEOUT) {
      console.log(`🔄 Using cached resource: ${url}`);
      return cachedEntry.resource;
    } else {
      console.log(`🗑 Cache expired for: ${url}, refetching...`);
      resourceCache.delete(url); // Remove expired entry
    }
  }

  try {
    console.log(`📥 Fetching new IIIF resource from: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new TamerlaneResourceError(
        `HTTP error! status: ${response.status}`,
      );
    }
    const data: any = await response.json();
    if (!['Manifest', 'Collection', 'AnnotationPage'].includes(data.type)) {
      throw new Error(`Invalid IIIF resource type: ${data.type}`);
    }
    const resource: IIIFResource = { type: data.type, data };
    // Store the fetched resource in cache with timestamp
    resourceCache.set(url, { resource, timestamp: currentTime });
    return resource;
  } catch (error) {
    console.error('❌ Error fetching IIIF resource:', error);
    throw new Error('Error fetching IIIF resource');
  }
}
