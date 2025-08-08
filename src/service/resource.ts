import { IIIFResource } from '../types/index.ts';
import { createError } from '../errors/structured.ts';
import { withRetry } from '../utils/retry.ts';

const CACHE_TIMEOUT = 1 * 60 * 1000; // 1 minutes
const resourceCache = new Map<
  string,
  { resource: IIIFResource; timestamp: number }
>(); // Cache with timestamps

export async function fetchResource(url: string, opts: { signal?: AbortSignal } = {}): Promise<IIIFResource> {
  const currentTime = Date.now();
  if (resourceCache.has(url)) {
    const cachedEntry = resourceCache.get(url)!;
    if (currentTime - cachedEntry.timestamp < CACHE_TIMEOUT) {
      console.log(`🔄 Using cached resource: ${url}`);
      return cachedEntry.resource;
    }
    console.log(`🗑 Cache expired for: ${url}, refetching...`);
    resourceCache.delete(url);
  }

  const attemptFetch = async (): Promise<IIIFResource> => {
    console.log(`📥 Fetching new IIIF resource from: ${url}`);
    const response = await fetch(url, { signal: opts.signal });
    if (!response.ok) {
      const err = createError('NETWORK_MANIFEST_FETCH', `HTTP error ${response.status} for ${url}`, { recoverable: response.status >= 500 || response.status === 429 });
      (err as any).httpStatus = response.status;
      throw err;
    }
    const data: any = await response.json();
    if (!['Manifest', 'Collection', 'AnnotationPage'].includes(data.type)) {
      throw createError('PARSING_MANIFEST', `Invalid IIIF resource type: ${data.type}`, { recoverable: false });
    }
    const resource: IIIFResource = { type: data.type, data };
    resourceCache.set(url, { resource, timestamp: currentTime });
    return resource;
  };

  try {
    return await withRetry(attemptFetch, {
      retries: 3,
      shouldRetry: (err) => {
        if (err?.name === 'AbortError') return false;
        return !!err?.recoverable; // only retry flagged recoverable
      },
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      console.warn(`⛔ Fetch aborted for: ${url}`);
      throw error;
    }
    console.error('❌ Error fetching IIIF resource:', error);
    if (error?.code) throw error; // already structured
    throw createError('NETWORK_MANIFEST_FETCH', 'Error fetching IIIF resource', { cause: error, recoverable: true });
  }
}
