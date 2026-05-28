import {
  encodeContentState,
  decodeContentState,
  sanitizeIiifUrlParam,
} from './contentState';

describe('contentState', () => {
  const canvas = 'https://example.com/iiif/canvas/1#xywh=10,20,30,40';
  const canvasNoFrag = 'https://example.com/iiif/canvas/1';
  const manifest = 'https://example.com/iiif/manifest.json';

  it('round-trips canvas, manifest, annotation and resource URLs', () => {
    const encoded = encodeContentState(
      canvas,
      manifest,
      'https://example.com/anno/1',
      'https://example.com/collection.json',
    );
    const decoded = decodeContentState(encoded);
    expect(decoded).toEqual({
      manifestUrl: manifest,
      canvasTarget: canvas,
      annotationId: 'https://example.com/anno/1',
      resourceUrl: 'https://example.com/collection.json',
    });
  });

  it('omits annotationId and resourceUrl when not provided', () => {
    const encoded = encodeContentState(canvasNoFrag, manifest);
    const decoded = decodeContentState(encoded);
    expect(decoded?.annotationId).toBeUndefined();
    expect(decoded?.resourceUrl).toBeUndefined();
    expect(decoded?.manifestUrl).toBe(manifest);
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

  it('drops resourceUrl when it uses an unsafe scheme but keeps the rest', () => {
    const payload = JSON.stringify({
      type: 'Annotation',
      resourceUrl: 'data:text/html,evil',
      target: {
        id: canvas,
        partOf: [{ id: manifest }],
      },
    });
    const encoded = Buffer.from(payload).toString('base64url');
    const decoded = decodeContentState(encoded);
    expect(decoded?.manifestUrl).toBe(manifest);
    expect(decoded?.resourceUrl).toBeUndefined();
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

  it('rejects ignores annotationId of wrong type', () => {
    const payload = JSON.stringify({
      type: 'Annotation',
      annotationId: { not: 'a string' },
      target: { id: canvas, partOf: [{ id: manifest }] },
    });
    const encoded = Buffer.from(payload).toString('base64url');
    const decoded = decodeContentState(encoded);
    expect(decoded?.annotationId).toBeUndefined();
  });
});

describe('sanitizeIiifUrlParam', () => {
  it('returns null for null/empty/whitespace', () => {
    expect(sanitizeIiifUrlParam(null)).toBeNull();
    expect(sanitizeIiifUrlParam('')).toBeNull();
    expect(sanitizeIiifUrlParam('   ')).toBeNull();
  });

  it('accepts http(s) URLs and trims them', () => {
    expect(sanitizeIiifUrlParam('  https://example.com/m.json  ')).toBe(
      'https://example.com/m.json',
    );
    expect(sanitizeIiifUrlParam('http://example.com')).toBe(
      'http://example.com',
    );
  });

  it('rejects unsafe schemes', () => {
    expect(sanitizeIiifUrlParam('javascript:alert(1)')).toBeNull();
    expect(sanitizeIiifUrlParam('data:text/html,evil')).toBeNull();
    expect(sanitizeIiifUrlParam('file:///etc/passwd')).toBeNull();
    expect(sanitizeIiifUrlParam('not a url at all')).toBeNull();
  });
});
