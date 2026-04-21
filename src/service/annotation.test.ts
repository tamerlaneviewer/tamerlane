import { getAnnotationsForTarget, normalizeAnnotationTargets } from './annotation';
import * as resource from './resource';
import { Maniiifest } from 'maniiifest';

jest.mock('./resource');
jest.mock('maniiifest');
jest.mock('../utils/logger.ts', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockFetchResource = resource.fetchResource as jest.Mock;
const mockManiiifestConstructor = Maniiifest as jest.Mock;
const mockParseAnnotation = Maniiifest.parseAnnotation as jest.Mock;
const mockParseAnnotationPage = Maniiifest.parseAnnotationPage as jest.Mock;

// Use a unique manifest URL per test to avoid hitting the module-level manifest cache
let urlCounter = 0;
const uniqueManifestUrl = () => `https://example.com/manifest-${++urlCounter}.json`;

const CANVAS_URL = 'https://example.com/canvas/1';
const ANNO_PAGE_URL = 'https://example.com/anno-page.json';

function makeManifestMock(canvasId: string, annotations: any[]) {
  return {
    getSpecificationType: () => 'Manifest',
    iterateManifestCanvas: () => [{ id: canvasId, annotations }],
  };
}

function makeAnnotationPageParser(annotations: any[], nextUrl: string | null = null) {
  return {
    iterateAnnotationPageAnnotation: () => annotations,
    getAnnotationPageNext: () => nextUrl,
  };
}

function makeAnnotationParser(targets: any[], bodies: any[] = []) {
  return {
    iterateAnnotationTarget: () => targets,
    iterateAnnotationTextualBody: () => bodies,
  };
}

describe('getAnnotationsForTarget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses Maniiifest.parseAnnotationPage for an inline annotation page', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    const inlinePage = { id: ANNO_PAGE_URL, items: [{ id: 'anno1' }] };

    mockFetchResource.mockResolvedValue({ type: 'Manifest', data: {} });
    mockManiiifestConstructor.mockReturnValue(makeManifestMock(CANVAS_URL, [inlinePage]));
    mockParseAnnotationPage.mockReturnValue(makeAnnotationPageParser([]));
    mockParseAnnotation.mockReturnValue(makeAnnotationParser([]));

    await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);

    expect(mockParseAnnotationPage).toHaveBeenCalledWith(inlinePage);
    // Ensure the old-style constructor was NOT used with 'AnnotationPage'
    expect(mockManiiifestConstructor).not.toHaveBeenCalledWith(inlinePage, 'AnnotationPage');
  });

  it('uses Maniiifest.parseAnnotation for each annotation', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    const anno = { id: 'anno1', motivation: 'commenting' };
    const inlinePage = { id: ANNO_PAGE_URL, items: [anno] };

    mockFetchResource.mockResolvedValue({ type: 'Manifest', data: {} });
    mockManiiifestConstructor.mockReturnValue(makeManifestMock(CANVAS_URL, [inlinePage]));
    mockParseAnnotationPage.mockReturnValue(makeAnnotationPageParser([anno]));
    mockParseAnnotation.mockReturnValue(makeAnnotationParser([CANVAS_URL]));

    await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);

    expect(mockParseAnnotation).toHaveBeenCalledWith(anno);
    // Ensure the old-style constructor was NOT used with 'Annotation'
    expect(mockManiiifestConstructor).not.toHaveBeenCalledWith(anno, 'Annotation');
  });

  it('returns annotation data for a matching canvas target', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    const anno = { id: 'anno1', motivation: 'commenting' };
    const inlinePage = { items: [anno] };

    mockFetchResource.mockResolvedValue({ type: 'Manifest', data: {} });
    mockManiiifestConstructor.mockReturnValue(makeManifestMock(CANVAS_URL, [inlinePage]));
    mockParseAnnotationPage.mockReturnValue(makeAnnotationPageParser([anno]));
    mockParseAnnotation.mockReturnValue(makeAnnotationParser(
      [CANVAS_URL],
      [{ value: 'Hello world', language: 'en' }],
    ));

    const result = await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'anno1',
      motivation: 'commenting',
      target: [CANVAS_URL],
      body: [{ value: 'Hello world', language: 'en' }],
    });
  });

  it('uses getAnnotationPageNext() for pagination and follows next pages', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    const PAGE2_URL = 'https://example.com/anno-page-2.json';
    const anno1 = { id: 'anno1', motivation: 'commenting' };
    const anno2 = { id: 'anno2', motivation: 'commenting' };
    const inlinePage = { items: [anno1] };

    mockFetchResource
      .mockResolvedValueOnce({ type: 'Manifest', data: {} })       // manifest fetch
      .mockResolvedValueOnce({ type: 'AnnotationPage', data: {} }); // page 2 fetch

    mockManiiifestConstructor.mockReturnValue(makeManifestMock(CANVAS_URL, [inlinePage]));

    // First page parser returns next URL, second returns null
    mockParseAnnotationPage
      .mockReturnValueOnce(makeAnnotationPageParser([anno1], PAGE2_URL))
      .mockReturnValueOnce(makeAnnotationPageParser([anno2], null));

    mockParseAnnotation.mockReturnValue(makeAnnotationParser([CANVAS_URL]));

    const result = await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);

    // fetchResource called for page 2
    expect(mockFetchResource).toHaveBeenCalledWith(PAGE2_URL, expect.any(Object));
    // parseAnnotationPage called twice: once for inline page, once for fetched page 2
    expect(mockParseAnnotationPage).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result.map(a => a.id)).toEqual(['anno1', 'anno2']);
  });

  it('fetches and parses a ref annotation page (id-only, no items)', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    const refPage = { id: ANNO_PAGE_URL }; // no items — triggers processAnnotationPageRef
    const anno = { id: 'anno1', motivation: 'painting' };

    mockFetchResource
      .mockResolvedValueOnce({ type: 'Manifest', data: {} })
      .mockResolvedValueOnce({ type: 'AnnotationPage', data: {} });

    mockManiiifestConstructor.mockReturnValue(makeManifestMock(CANVAS_URL, [refPage]));
    mockParseAnnotationPage.mockReturnValue(makeAnnotationPageParser([anno]));
    mockParseAnnotation.mockReturnValue(makeAnnotationParser([CANVAS_URL]));

    const result = await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);

    expect(mockFetchResource).toHaveBeenCalledWith(ANNO_PAGE_URL, expect.any(Object));
    expect(mockParseAnnotationPage).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });

  it('normalises body language when it is an object with a value property', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    const anno = { id: 'anno1', motivation: 'commenting' };
    const inlinePage = { items: [anno] };

    mockFetchResource.mockResolvedValue({ type: 'Manifest', data: {} });
    mockManiiifestConstructor.mockReturnValue(makeManifestMock(CANVAS_URL, [inlinePage]));
    mockParseAnnotationPage.mockReturnValue(makeAnnotationPageParser([anno]));
    mockParseAnnotation.mockReturnValue(makeAnnotationParser(
      [CANVAS_URL],
      [{ value: 'Bonjour', language: { value: 'fr' } }],
    ));

    const result = await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);

    expect(result[0].body[0].language).toBe('fr');
  });

  it('picks first motivation when motivation is an array', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    const anno = { id: 'anno1', motivation: ['commenting', 'tagging'] };
    const inlinePage = { items: [anno] };

    mockFetchResource.mockResolvedValue({ type: 'Manifest', data: {} });
    mockManiiifestConstructor.mockReturnValue(makeManifestMock(CANVAS_URL, [inlinePage]));
    mockParseAnnotationPage.mockReturnValue(makeAnnotationPageParser([anno]));
    mockParseAnnotation.mockReturnValue(makeAnnotationParser([CANVAS_URL]));

    const result = await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);

    expect(result[0].motivation).toBe('commenting');
  });

  it('skips annotations whose target does not match the canvas', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    const anno = { id: 'anno1', motivation: 'commenting' };
    const inlinePage = { items: [anno] };
    const OTHER_CANVAS = 'https://example.com/canvas/99';

    mockFetchResource.mockResolvedValue({ type: 'Manifest', data: {} });
    mockManiiifestConstructor.mockReturnValue(makeManifestMock(CANVAS_URL, [inlinePage]));
    mockParseAnnotationPage.mockReturnValue(makeAnnotationPageParser([anno]));
    // Target points at a different canvas
    mockParseAnnotation.mockReturnValue(makeAnnotationParser([OTHER_CANVAS]));

    const result = await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);

    expect(result).toHaveLength(0);
  });

  it('returns empty array when no canvas matches the target URL', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    mockFetchResource.mockResolvedValue({ type: 'Manifest', data: {} });
    mockManiiifestConstructor.mockReturnValue({
      getSpecificationType: () => 'Manifest',
      iterateManifestCanvas: () => [{ id: 'https://example.com/canvas/other', annotations: [] }],
    });

    const result = await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);

    expect(result).toHaveLength(0);
  });

  it('throws NETWORK_MANIFEST_FETCH when manifest fetch returns wrong type', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    mockFetchResource.mockResolvedValue({ type: 'AnnotationPage', data: {} });

    await expect(getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL)).rejects.toMatchObject({
      code: 'NETWORK_MANIFEST_FETCH',
    });
  });

  it('throws NETWORK_ANNOTATION_FETCH when ref page fetch returns wrong type', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    const refPage = { id: ANNO_PAGE_URL };

    mockFetchResource
      .mockResolvedValueOnce({ type: 'Manifest', data: {} })
      .mockResolvedValueOnce({ type: 'Manifest', data: {} }); // wrong type for annotation page

    mockManiiifestConstructor.mockReturnValue(makeManifestMock(CANVAS_URL, [refPage]));

    await expect(getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL)).rejects.toMatchObject({
      code: 'NETWORK_ANNOTATION_FETCH',
    });
  });

  it('throws AbortError when signal is aborted', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    const controller = new AbortController();
    controller.abort();
    const inlinePage = { items: [] };

    mockFetchResource.mockResolvedValue({ type: 'Manifest', data: {} });
    mockManiiifestConstructor.mockReturnValue(makeManifestMock(CANVAS_URL, [inlinePage]));
    mockParseAnnotationPage.mockReturnValue({
      iterateAnnotationPageAnnotation: () => [],
      getAnnotationPageNext: () => 'https://example.com/next',
    });

    await expect(
      getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('caches the manifest and does not re-fetch on a second call', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    const inlinePage = { items: [] };

    mockFetchResource.mockResolvedValue({ type: 'Manifest', data: {} });
    mockManiiifestConstructor.mockReturnValue(makeManifestMock(CANVAS_URL, [inlinePage]));
    mockParseAnnotationPage.mockReturnValue(makeAnnotationPageParser([]));

    await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);
    await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);

    // fetchResource should only be called once despite two getAnnotationsForTarget calls
    expect(mockFetchResource).toHaveBeenCalledTimes(1);
  });
});

describe('normalizeAnnotationTargets', () => {
  it('returns the string if target is a string', () => {
    expect(normalizeAnnotationTargets('canvas1')).toEqual(['canvas1']);
  });

  it('flattens arrays of strings', () => {
    expect(normalizeAnnotationTargets(['canvas1', 'canvas2'])).toEqual(['canvas1', 'canvas2']);
  });

  it('extracts id from object', () => {
    expect(normalizeAnnotationTargets({ id: 'canvas3' })).toEqual(['canvas3']);
  });

  it('extracts source and selector', () => {
    expect(
      normalizeAnnotationTargets({ source: 'canvas4', selector: { type: 'FragmentSelector', value: 'xywh=10,20,30,40' } })
    ).toEqual(['canvas4#xywh=10,20,30,40']);
  });

  it('extracts source from nested object', () => {
    expect(
      normalizeAnnotationTargets({ source: { id: 'canvas5' } })
    ).toEqual(['canvas5']);
  });

  it('extracts value if no id or source', () => {
    expect(normalizeAnnotationTargets({ value: 'canvas6' })).toEqual(['canvas6']);
  });

  it('handles deeply nested arrays', () => {
    expect(
      normalizeAnnotationTargets([
        'canvas7',
        [{ id: 'canvas8' }, { source: 'canvas9', selector: { value: 'xywh=1,2,3,4' } }],
      ])
    ).toEqual(['canvas7', 'canvas8', 'canvas9#xywh=1,2,3,4']);
  });
});