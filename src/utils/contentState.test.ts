import {
  encodeContentState,
  decodeContentState,
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

  it('encodes using standard IIIF properties only (no annotation identity)', () => {
    const encoded = encodeContentState(
      canvas,
      manifest,
      'https://example.com/collection.json',
    );
    const obj = JSON.parse(Buffer.from(encoded, 'base64url').toString());
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
    const obj = JSON.parse(Buffer.from(encoded, 'base64url').toString());
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
