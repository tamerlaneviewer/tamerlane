import {
  encodeContentState,
  decodeContentState,
  interpretContentStateParam,
} from './contentState';

describe('contentState', () => {
  const canvas = 'https://example.com/iiif/canvas/1#xywh=10,20,30,40';
  const canvasNoFrag = 'https://example.com/iiif/canvas/1';
  const manifest = 'https://example.com/iiif/manifest.json';

  it('round-trips canvas, manifest and collection URLs', () => {
    const encoded = encodeContentState(
      canvas,
      manifest,
      'https://example.com/collection.json',
    );
    const decoded = decodeContentState(encoded);
    expect(decoded).toEqual({
      manifestUrl: manifest,
      canvasTarget: canvas,
      collectionUrl: 'https://example.com/collection.json',
    });
  });

  it('encodes using the spec algorithm (base64url of URI-encoded JSON)', () => {
    const encoded = encodeContentState(canvas, manifest);
    // Base64url-decoding yields the URI-encoded JSON, so it starts with the
    // percent-encoded '{' ("%7B") rather than a raw '{'.
    const decodedBytes = Buffer.from(encoded, 'base64url').toString();
    expect(decodedBytes.startsWith('%7B')).toBe(true);
    // And it still round-trips back to the original values.
    expect(decodeContentState(encoded)).toEqual({
      manifestUrl: manifest,
      canvasTarget: canvas,
    });
  });

  it('encodes using standard IIIF properties only (no annotation identity)', () => {
    const encoded = encodeContentState(
      canvas,
      manifest,
      'https://example.com/collection.json',
    );
    // Spec encoding is base64url(encodeURIComponent(json)); reverse both steps.
    const obj = JSON.parse(
      decodeURIComponent(Buffer.from(encoded, 'base64url').toString()),
    );
    // No custom sibling fields, and no annotation identity is encoded.
    expect(obj.annotationId).toBeUndefined();
    expect(obj.resourceUrl).toBeUndefined();
    expect(obj.target.annotations).toBeUndefined();
    // The target is just the canvas region.
    expect(obj.target).toMatchObject({ id: canvas, type: 'Canvas' });
    // Collection nested under the manifest's partOf.
    expect(obj.target.partOf[0]).toMatchObject({
      id: manifest,
      type: 'Manifest',
    });
    expect(obj.target.partOf[0].partOf[0]).toMatchObject({
      id: 'https://example.com/collection.json',
      type: 'Collection',
    });
  });

  it('omits the collection node when not provided', () => {
    const encoded = encodeContentState(canvasNoFrag, manifest);
    const obj = JSON.parse(
      decodeURIComponent(Buffer.from(encoded, 'base64url').toString()),
    );
    expect(obj.target.partOf[0].partOf).toBeUndefined();
    const decoded = decodeContentState(encoded);
    expect(decoded?.collectionUrl).toBeUndefined();
    expect(decoded?.manifestUrl).toBe(manifest);
    expect(decoded?.canvasTarget).toBe(canvasNoFrag);
  });

  it('returns null for empty input', () => {
    expect(decodeContentState('')).toBeNull();
  });

  it('returns null for plain http(s) URLs (those are not content states)', () => {
    expect(decodeContentState('https://example.com/manifest.json')).toBeNull();
    expect(decodeContentState('http://example.com/x')).toBeNull();
  });

  it('returns null for malformed base64 or JSON', () => {
    expect(decodeContentState('not!!!base64')).toBeNull();
    expect(decodeContentState('Zm9v')).toBeNull(); // "foo" - not JSON
  });

  it('returns null when the object is not an Annotation', () => {
    const bad = Buffer.from(
      JSON.stringify({ type: 'Manifest', target: { id: canvas } }),
    ).toString('base64url');
    expect(decodeContentState(bad)).toBeNull();
  });

  it('returns null when manifest URL uses an unsafe scheme', () => {
    const payload = JSON.stringify({
      type: 'Annotation',
      target: {
        id: canvas,
        partOf: [{ id: 'javascript:alert(1)' }],
      },
    });
    const encoded = Buffer.from(payload).toString('base64url');
    expect(decodeContentState(encoded)).toBeNull();
  });

  it('returns null when canvas target uses an unsafe scheme', () => {
    const payload = JSON.stringify({
      type: 'Annotation',
      target: {
        id: 'file:///etc/passwd',
        partOf: [{ id: manifest }],
      },
    });
    const encoded = Buffer.from(payload).toString('base64url');
    expect(decodeContentState(encoded)).toBeNull();
  });

  it('drops the collection when it uses an unsafe scheme but keeps the rest', () => {
    const payload = JSON.stringify({
      type: 'Annotation',
      target: {
        id: canvas,
        partOf: [
          {
            id: manifest,
            partOf: [{ id: 'data:text/html,evil' }],
          },
        ],
      },
    });
    const encoded = Buffer.from(payload).toString('base64url');
    const decoded = decodeContentState(encoded);
    expect(decoded?.manifestUrl).toBe(manifest);
    expect(decoded?.collectionUrl).toBeUndefined();
  });

  it('returns null when partOf is missing or wrong shape', () => {
    const p1 = Buffer.from(
      JSON.stringify({ type: 'Annotation', target: { id: canvas } }),
    ).toString('base64url');
    expect(decodeContentState(p1)).toBeNull();

    const p2 = Buffer.from(
      JSON.stringify({
        type: 'Annotation',
        target: { id: canvas, partOf: [{ id: { nested: 'object' } }] },
      }),
    ).toString('base64url');
    expect(decodeContentState(p2)).toBeNull();
  });

  it('rejects payloads larger than the size cap', () => {
    const huge = 'A'.repeat(65 * 1024);
    expect(decodeContentState(huge)).toBeNull();
  });
});

describe('compact IIIF Content State target body', () => {
  const canvas = 'http://canvas/0680#xywh=226,680,1218,370';
  const manifest = 'https://digitaldomesday.org/iiif/lincolnshire.json';
  const collection = 'https://digitaldomesday.org/iiif/domesday.json';

  const compactBody = {
    id: canvas,
    type: 'Canvas',
    partOf: [
      {
        id: manifest,
        type: 'Manifest',
        partOf: [{ id: collection, type: 'Collection' }],
      },
    ],
  };

  // IIIF Content State 1.0 encoding: base64url(encodeURIComponent(json)).
  const specEncode = (obj: unknown) =>
    Buffer.from(encodeURIComponent(JSON.stringify(obj))).toString('base64url');

  it('decodes a compact Canvas target body', () => {
    const decoded = decodeContentState(specEncode(compactBody));
    expect(decoded).toEqual({
      manifestUrl: manifest,
      canvasTarget: canvas,
      collectionUrl: collection,
    });
  });

  it('decodes the spec example encoded URL value', () => {
    const specValue =
      'JTdCJTIyaWQlMjIlM0ElMjJodHRwJTNBJTJGJTJGY2FudmFzJTJGMDY4MCUyM3h5d2glM0QyMjYlMkM2ODAlMkMxMjE4JTJDMzcwJTIyJTJDJTIydHlwZSUyMiUzQSUyMkNhbnZhcyUyMiUyQyUyMnBhcnRPZiUyMiUzQSU1QiU3QiUyMmlkJTIyJTNBJTIyaHR0cHMlM0ElMkYlMkZkaWdpdGFsZG9tZXNkYXkub3JnJTJGaWlpZiUyRmxpbmNvbG5zaGlyZS5qc29uJTIyJTJDJTIydHlwZSUyMiUzQSUyMk1hbmlmZXN0JTIyJTJDJTIycGFydE9mJTIyJTNBJTVCJTdCJTIyaWQlMjIlM0ElMjJodHRwcyUzQSUyRiUyRmRpZ2l0YWxkb21lc2RheS5vcmclMkZpaWlmJTJGZG9tZXNkYXkuanNvbiUyMiUyQyUyMnR5cGUlMjIlM0ElMjJDb2xsZWN0aW9uJTIyJTdEJTVEJTdEJTVEJTdE';
    const decoded = decodeContentState(specValue);
    expect(decoded).toEqual({
      manifestUrl: manifest,
      canvasTarget: canvas,
      collectionUrl: collection,
    });
  });

  it('decodes a compact target body without a nested collection', () => {
    const decoded = decodeContentState(
      specEncode({
        id: canvas,
        type: 'Canvas',
        partOf: [{ id: manifest, type: 'Manifest' }],
      }),
    );
    expect(decoded).toEqual({
      manifestUrl: manifest,
      canvasTarget: canvas,
    });
  });

  it('decodes an untyped compact target body via partOf', () => {
    const decoded = decodeContentState(
      specEncode({ id: canvas, partOf: [{ id: manifest, type: 'Manifest' }] }),
    );
    expect(decoded?.manifestUrl).toBe(manifest);
    expect(decoded?.canvasTarget).toBe(canvas);
  });

  it('decodes a compact Manifest target body without a canvas', () => {
    const decoded = decodeContentState(
      specEncode({
        id: manifest,
        type: 'Manifest',
        partOf: [{ id: collection, type: 'Collection' }],
      }),
    );
    expect(decoded).toEqual({
      manifestUrl: manifest,
      collectionUrl: collection,
    });
    expect(decoded?.canvasTarget).toBeUndefined();
  });

  it('rejects a compact body whose target uses an unsafe scheme', () => {
    const decoded = decodeContentState(
      specEncode({
        id: 'javascript:alert(1)',
        type: 'Canvas',
        partOf: [{ id: manifest }],
      }),
    );
    expect(decoded).toBeNull();
  });

  it('rejects a compact body whose manifest uses an unsafe scheme', () => {
    const decoded = decodeContentState(
      specEncode({
        id: canvas,
        type: 'Canvas',
        partOf: [{ id: 'file:///etc/passwd' }],
      }),
    );
    expect(decoded).toBeNull();
  });
});

describe('interpretContentStateParam', () => {
  const canvas = 'https://example.com/iiif/canvas/1#xywh=10,20,30,40';
  const manifest = 'https://example.com/iiif/manifest.json';

  it('classifies plain http(s) URLs as a url', () => {
    expect(interpretContentStateParam(manifest)).toEqual({
      kind: 'url',
      url: manifest,
    });
  });

  it('classifies a valid annotation as a content-state', () => {
    const encoded = encodeContentState(canvas, manifest);
    const result = interpretContentStateParam(encoded);
    expect(result.kind).toBe('content-state');
  });

  it('reports a decode error for values that are neither URL nor base64', () => {
    const result = interpretContentStateParam('not!!!base64');
    expect(result).toMatchObject({ kind: 'error', stage: 'decode' });
  });

  it('reports a parse error for base64 that is not JSON', () => {
    const result = interpretContentStateParam(
      Buffer.from('not json').toString('base64url'),
    );
    expect(result).toMatchObject({ kind: 'error', stage: 'parse' });
  });

  it('reports a discover error when no Manifest can be found', () => {
    const result = interpretContentStateParam(
      Buffer.from(
        JSON.stringify({ id: canvas, type: 'Canvas' }),
      ).toString('base64url'),
    );
    expect(result).toMatchObject({ kind: 'error', stage: 'discover' });
  });

  it('reports a discover error for an unsafe target scheme', () => {
    const result = interpretContentStateParam(
      Buffer.from(
        JSON.stringify({
          id: 'javascript:alert(1)',
          type: 'Canvas',
          partOf: [{ id: manifest }],
        }),
      ).toString('base64url'),
    );
    expect(result).toMatchObject({ kind: 'error', stage: 'discover' });
  });
});
