// IIIF Content State API 1.0 helpers.
// Spec: https://iiif.io/api/content-state/1.0/

// Hard cap on the size of an encoded content-state blob to avoid wasting CPU
// on huge base64 payloads supplied through query strings (DoS guard).
const MAX_CONTENT_STATE_LENGTH = 64 * 1024;

export function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function base64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64urlDecode(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padding));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Encodes a canvas target URI (with optional #xywh fragment) and manifest URL
 * into a IIIF Content State 1.0 base64url string for use in ?iiif-content=.
 */
export function encodeContentState(
  canvasTarget: string,
  manifestUrl: string,
  annotationId?: string,
  resourceUrl?: string,
): string {
  const annotation = {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id: `${window.location.href.split('?')[0]}#content-state`,
    type: 'Annotation',
    motivation: ['contentState'],
    annotationId,
    resourceUrl,
    target: {
      id: canvasTarget,
      type: 'Canvas',
      partOf: [{ id: manifestUrl, type: 'Manifest' }],
    },
  };
  return base64urlEncode(JSON.stringify(annotation));
}

export interface DecodedContentState {
  manifestUrl: string;
  canvasTarget: string;
  annotationId?: string;
  resourceUrl?: string;
}

/**
 * Attempts to decode a ?iiif-content= value as a IIIF Content State annotation.
 * Returns null if the value is a plain URL or otherwise not a valid content state.
 */
export function decodeContentState(value: string): DecodedContentState | null {
  if (!value) return null;
  // Reject oversized payloads up front (DoS guard).
  if (value.length > MAX_CONTENT_STATE_LENGTH) return null;
  // Plain manifest URLs are not content states
  if (value.startsWith('http://') || value.startsWith('https://')) return null;
  try {
    const json = base64urlDecode(value);
    // Defense in depth: also cap the decoded JSON size.
    if (json.length > MAX_CONTENT_STATE_LENGTH) return null;
    const obj = JSON.parse(json);
    if (obj?.type !== 'Annotation') return null;
    const target = obj.target;
    if (!target || typeof target.id !== 'string') return null;
    const partOf = Array.isArray(target.partOf) ? target.partOf[0] : null;
    const manifestUrl = partOf && typeof partOf.id === 'string' ? partOf.id : null;
    if (!isSafeHttpUrl(manifestUrl)) return null;
    if (!isSafeHttpUrl(target.id)) return null;
    const resourceUrl =
      typeof obj.resourceUrl === 'string' && isSafeHttpUrl(obj.resourceUrl)
        ? obj.resourceUrl
        : undefined;
    return {
      manifestUrl: manifestUrl as string,
      canvasTarget: target.id,
      annotationId:
        typeof obj.annotationId === 'string' ? obj.annotationId : undefined,
      resourceUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Validates that a URL-bearing query param is a safe http(s) URL. Returns the
 * trimmed value or null. Use this before treating any raw URL query parameter
 * (e.g. `iiif-resource`, `iiif-manifest`) as a fetch target.
 */
export function sanitizeIiifUrlParam(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return isSafeHttpUrl(trimmed) ? trimmed : null;
}
