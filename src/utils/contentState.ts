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
 * The value is encoded per the IIIF Content State 1.0 algorithm:
 * `base64url(encodeURIComponent(json))` — the JSON is URI-encoded first, then
 * base64url-encoded with padding removed. This makes Tamerlane's own share
 * links interoperable with any other spec-compliant Content State viewer.
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
  // IIIF Content State 1.0: URI-encode the JSON, then base64url-encode it.
  return base64urlEncode(encodeURIComponent(JSON.stringify(annotation)));
}

export interface DecodedContentState {
  manifestUrl: string;
  // A specific canvas (region) target, when the content state points at one.
  // Absent for a compact Manifest target body, which only identifies the
  // manifest to load.
  canvasTarget?: string;
  collectionUrl?: string;
}

/**
 * The result of interpreting a raw ?iiif-content= value.
 *
 * - `url`: the value is a plain http(s) Manifest/Collection URL.
 * - `content-state`: the value decoded to a IIIF Content State (either the full
 *   Annotation form or the compact target-body form).
 * - `error`: the value could not be interpreted. `stage` reports where it
 *   failed so the UI can explain whether decoding, JSON parsing, or Manifest
 *   discovery was the problem.
 */
export type ContentStateInterpretation =
  | { kind: 'url'; url: string }
  | { kind: 'content-state'; state: DecodedContentState }
  | {
      kind: 'error';
      stage: 'decode' | 'parse' | 'discover';
      message: string;
    };

// Reads the parent collection (if any) nested under a node's `partOf`.
function extractCollectionUrl(node: unknown): string | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const partOf = (node as { partOf?: unknown }).partOf;
  const nested = Array.isArray(partOf) ? partOf[0] : null;
  const candidate =
    nested && typeof (nested as { id?: unknown }).id === 'string'
      ? (nested as { id: string }).id
      : undefined;
  return candidate && isSafeHttpUrl(candidate) ? candidate : undefined;
}

/**
 * Interprets a raw `?iiif-content=` value, supporting every form Tamerlane
 * accepts:
 *
 *  1. A plain http(s) Manifest or Collection URL.
 *  2. A full IIIF Content State Annotation (`type: "Annotation"` with a
 *     `target` body).
 *  3. A compact IIIF Content State target body — the decoded object is itself
 *     the `Canvas`/`Range`/`Manifest` that a full Annotation would carry as its
 *     `target`.
 *
 * The encoded (non-URL) forms follow the IIIF Content State 1.0 algorithm:
 * `base64url(encodeURIComponent(json))`. Decoding reverses both steps.
 *
 * The selected annotation is intentionally not read here — on restore the
 * canvas region is drawn as an overlay in the viewer.
 */
export function interpretContentStateParam(
  value: string,
): ContentStateInterpretation {
  if (!value) {
    return {
      kind: 'error',
      stage: 'decode',
      message: 'No IIIF content value was provided.',
    };
  }
  // Reject oversized payloads up front (DoS guard).
  if (value.length > MAX_CONTENT_STATE_LENGTH) {
    return {
      kind: 'error',
      stage: 'decode',
      message: 'The IIIF content value is too large to process.',
    };
  }
  // Plain manifest/collection URLs are passed straight through.
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return { kind: 'url', url: value };
  }

  // Base64url-decode the Content State blob.
  let json: string;
  try {
    // IIIF Content State 1.0 encodes the value as
    // base64url(encodeURIComponent(json)), so reverse both steps: base64url-
    // decode, then URI-decode to recover the JSON.
    json = decodeURIComponent(base64urlDecode(value));
  } catch {
    return {
      kind: 'error',
      stage: 'decode',
      message:
        'Could not decode the IIIF content value. It is neither an http(s) URL nor a valid IIIF Content State.',
    };
  }
  // Defense in depth: also cap the decoded JSON size.
  if (json.length > MAX_CONTENT_STATE_LENGTH) {
    return {
      kind: 'error',
      stage: 'decode',
      message: 'The decoded IIIF Content State is too large to process.',
    };
  }

  let obj: unknown;
  try {
    obj = JSON.parse(json);
  } catch {
    return {
      kind: 'error',
      stage: 'parse',
      message: 'The IIIF Content State could not be parsed as JSON.',
    };
  }
  if (!obj || typeof obj !== 'object') {
    return {
      kind: 'error',
      stage: 'parse',
      message: 'The IIIF Content State is not a valid JSON object.',
    };
  }

  // Full Annotation form → use its target body; compact form → the object
  // itself is the target body (a Canvas, Range or Manifest).
  const record = obj as Record<string, unknown>;
  const target =
    record.type === 'Annotation' && record.target
      ? (record.target as Record<string, unknown>)
      : record;

  if (!target || typeof target !== 'object' || typeof target.id !== 'string') {
    return {
      kind: 'error',
      stage: 'discover',
      message: 'The IIIF Content State does not identify a target resource.',
    };
  }
  if (!isSafeHttpUrl(target.id)) {
    return {
      kind: 'error',
      stage: 'discover',
      message: 'The IIIF Content State target uses an unsupported URL scheme.',
    };
  }

  // A Manifest target body identifies the manifest to load directly; there is
  // no specific canvas to navigate to.
  if (target.type === 'Manifest') {
    return {
      kind: 'content-state',
      state: {
        manifestUrl: target.id,
        collectionUrl: extractCollectionUrl(target),
      },
    };
  }

  // Canvas / Range (or an untyped body): the id is the canvas (region) target
  // and the manifest is discovered via `partOf`.
  const manifestNode = Array.isArray(target.partOf) ? target.partOf[0] : null;
  const manifestUrl =
    manifestNode && typeof manifestNode.id === 'string'
      ? manifestNode.id
      : null;
  if (!isSafeHttpUrl(manifestUrl)) {
    return {
      kind: 'error',
      stage: 'discover',
      message:
        'The IIIF Content State does not reference a Manifest via partOf.',
    };
  }

  return {
    kind: 'content-state',
    state: {
      manifestUrl,
      canvasTarget: target.id,
      // Collection context is nested under the manifest's partOf.
      collectionUrl: extractCollectionUrl(manifestNode),
    },
  };
}

/**
 * Attempts to decode a ?iiif-content= value as a IIIF Content State.
 * Returns null if the value is a plain URL or otherwise not a valid content
 * state. Prefer {@link interpretContentStateParam} when you need to surface
 * why a value was rejected.
 */
export function decodeContentState(value: string): DecodedContentState | null {
  const result = interpretContentStateParam(value);
  return result.kind === 'content-state' ? result.state : null;
}
