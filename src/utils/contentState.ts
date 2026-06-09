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
 * Encodes a canvas target URI (with optional #xywh fragment) plus its manifest
 * and an optional parent collection into a IIIF Content State 1.0 base64url
 * string for use in ?iiif-content=.
 *
 * Everything is expressed with standard IIIF Presentation properties so the
 * payload is self-contained and portable to any other Content State-aware
 * viewer: the target is the canvas region, and the parent collection (if any)
 * is nested via the manifest's `partOf`.
 *
 * Note: there is no spec-defined way to encode "this specific annotation is
 * selected". We deliberately encode only the canvas region (`#xywh`); on
 * restore the region is drawn as an overlay in the viewer (see
 * useContentStateRestoration), and sharing a specific annotation's identity is
 * handled separately by the "Copy Annotation ID" action.
 */
export function encodeContentState(
  canvasTarget: string,
  manifestUrl: string,
  collectionUrl?: string,
): string {
  const manifestNode: {
    id: string;
    type: 'Manifest';
    partOf?: { id: string; type: 'Collection' }[];
  } = { id: manifestUrl, type: 'Manifest' };
  if (collectionUrl) {
    manifestNode.partOf = [{ id: collectionUrl, type: 'Collection' }];
  }

  const annotation = {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id: `${window.location.href.split('?')[0]}#content-state`,
    type: 'Annotation',
    motivation: ['contentState'],
    target: {
      id: canvasTarget,
      type: 'Canvas',
      partOf: [manifestNode],
    },
  };
  return base64urlEncode(JSON.stringify(annotation));
}

export interface DecodedContentState {
  manifestUrl: string;
  canvasTarget: string;
  collectionUrl?: string;
}

/**
 * Attempts to decode a ?iiif-content= value as a IIIF Content State annotation.
 * Returns null if the value is a plain URL or otherwise not a valid content state.
 *
 * The selected annotation is intentionally not read here — on restore the canvas
 * region is drawn as an overlay in the viewer.
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
    if (!isSafeHttpUrl(target.id)) return null;

    const manifestNode = Array.isArray(target.partOf) ? target.partOf[0] : null;
    const manifestUrl =
      manifestNode && typeof manifestNode.id === 'string'
        ? manifestNode.id
        : null;
    if (!isSafeHttpUrl(manifestUrl)) return null;

    // Collection context is nested under the manifest's partOf.
    const nestedCollection =
      manifestNode && Array.isArray(manifestNode.partOf)
        ? manifestNode.partOf[0]
        : null;
    const collectionCandidate =
      nestedCollection && typeof nestedCollection.id === 'string'
        ? nestedCollection.id
        : undefined;
    const collectionUrl =
      collectionCandidate && isSafeHttpUrl(collectionCandidate)
        ? collectionCandidate
        : undefined;

    return {
      manifestUrl: manifestUrl as string,
      canvasTarget: target.id,
      collectionUrl,
    };
  } catch {
    return null;
  }
}
