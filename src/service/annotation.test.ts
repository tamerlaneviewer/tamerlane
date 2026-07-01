import { getAnnotationsForTarget, normalizeAnnotationTargets } from './annotation';
import * as resource from './resource';
import { Maniiifest } from 'maniiifest';

jest.mock('./resource');
jest.mock('maniiifest');
jest.mock('../utils/logger.ts', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockFetchResource = resource.fetchResource as jest.Mock;
const mockManiiifestConstructor = Maniiifest as unknown as jest.Mock;
// Production code uses the v2 static factories `Maniiifest.parseAnnotation`
// and `Maniiifest.parseAnnotationPage`. jest.mock auto-mocks those statics as
// jest.fn()s. The constructor itself is still used for Manifest resources, so
// we expose `setManifestMock` to control what `new Maniiifest(data)` returns.
const mockParseAnnotation = Maniiifest.parseAnnotation as jest.Mock;
const mockParseAnnotationPage = Maniiifest.parseAnnotationPage as jest.Mock;
let manifestMock: any = null;
const setManifestMock = (m: any) => { manifestMock = m; };

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
    getAnnotationPage: () => ({ next: nextUrl }),
  };
}

function makeAnnotationParser(
  targets: any[],
  bodies: any[] = [],
  targetFeatures: any[] = [],
  bodyFeatures: any[] = [],
  singleBody: any = null,
) {
  return {
    iterateAnnotationTarget: () => targets,
    iterateAnnotationTextualBody: () => bodies,
    iterateAnnotationTargetFeature: () => targetFeatures,
    iterateAnnotationFeature: () => bodyFeatures,
    getAnnotationBody: () => singleBody,
  };
}

describe('getAnnotationsForTarget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    manifestMock = null;
    mockManiiifestConstructor.mockImplementation(() => manifestMock);
  });

  it('routes inline annotation pages through the AnnotationPage parser', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    const inlinePage = { id: ANNO_PAGE_URL, items: [{ id: 'anno1' }] };

    mockFetchResource.mockResolvedValue({ type: 'Manifest', data: {} });
    setManifestMock(makeManifestMock(CANVAS_URL, [inlinePage]));
    mockParseAnnotationPage.mockReturnValue(makeAnnotationPageParser([]));
    mockParseAnnotation.mockReturnValue(makeAnnotationParser([]));

    await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);

    expect(mockParseAnnotationPage).toHaveBeenCalledWith(inlinePage);
  });

  it('routes each annotation through the Annotation parser', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    const anno = { id: 'anno1', motivation: 'commenting' };
    const inlinePage = { id: ANNO_PAGE_URL, items: [anno] };

    mockFetchResource.mockResolvedValue({ type: 'Manifest', data: {} });
    setManifestMock(makeManifestMock(CANVAS_URL, [inlinePage]));
    mockParseAnnotationPage.mockReturnValue(makeAnnotationPageParser([anno]));
    mockParseAnnotation.mockReturnValue(makeAnnotationParser([CANVAS_URL]));

    await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);

    expect(mockParseAnnotation).toHaveBeenCalledWith(anno);
  });

  it('returns annotation data for a matching canvas target', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    const anno = { id: 'anno1', motivation: 'commenting' };
    const inlinePage = { items: [anno] };

    mockFetchResource.mockResolvedValue({ type: 'Manifest', data: {} });
    setManifestMock(makeManifestMock(CANVAS_URL, [inlinePage]));
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

  it('uses getAnnotationPage().next for pagination and follows next pages', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    const PAGE2_URL = 'https://example.com/anno-page-2.json';
    const anno1 = { id: 'anno1', motivation: 'commenting' };
    const anno2 = { id: 'anno2', motivation: 'commenting' };
    const inlinePage = { items: [anno1] };

    mockFetchResource
      .mockResolvedValueOnce({ type: 'Manifest', data: {} })       // manifest fetch
      .mockResolvedValueOnce({ type: 'AnnotationPage', data: {} }); // page 2 fetch

    setManifestMock(makeManifestMock(CANVAS_URL, [inlinePage]));

    // First page parser returns next URL, second returns null
    mockParseAnnotationPage
      .mockReturnValueOnce(makeAnnotationPageParser([anno1], PAGE2_URL))
      .mockReturnValueOnce(makeAnnotationPageParser([anno2], null));

    mockParseAnnotation.mockReturnValue(makeAnnotationParser([CANVAS_URL]));

    const result = await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);

    // fetchResource called for page 2
    expect(mockFetchResource).toHaveBeenCalledWith(PAGE2_URL, expect.any(Object));
    // AnnotationPage constructor called twice: once for inline page, once for fetched page 2
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

    setManifestMock(makeManifestMock(CANVAS_URL, [refPage]));
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
    setManifestMock(makeManifestMock(CANVAS_URL, [inlinePage]));
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
    setManifestMock(makeManifestMock(CANVAS_URL, [inlinePage]));
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
    setManifestMock(makeManifestMock(CANVAS_URL, [inlinePage]));
    mockParseAnnotationPage.mockReturnValue(makeAnnotationPageParser([anno]));
    // Target points at a different canvas
    mockParseAnnotation.mockReturnValue(makeAnnotationParser([OTHER_CANVAS]));

    const result = await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);

    expect(result).toHaveLength(0);
  });

  it('returns empty array when no canvas matches the target URL', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    mockFetchResource.mockResolvedValue({ type: 'Manifest', data: {} });
    setManifestMock({
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

    setManifestMock(makeManifestMock(CANVAS_URL, [refPage]));

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
    setManifestMock(makeManifestMock(CANVAS_URL, [inlinePage]));
    mockParseAnnotationPage.mockReturnValue({
      iterateAnnotationPageAnnotation: () => [],
      getAnnotationPage: () => ({ next: 'https://example.com/next' }),
    });

    await expect(
      getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('caches the manifest and does not re-fetch on a second call', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    const inlinePage = { items: [] };

    mockFetchResource.mockResolvedValue({ type: 'Manifest', data: {} });
    setManifestMock(makeManifestMock(CANVAS_URL, [inlinePage]));
    mockParseAnnotationPage.mockReturnValue(makeAnnotationPageParser([]));

    await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);
    await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);

    // fetchResource should only be called once despite two getAnnotationsForTarget calls
    expect(mockFetchResource).toHaveBeenCalledTimes(1);
  });

  it('renders a GeoJSON Feature target as an svg overlay on the canvas', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    const feature = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [10, 0], [10, 10], [0, 0]]],
      },
      properties: { source: 'extract' },
    };
    const geoAnno = {
      id: 'geo1',
      type: 'Annotation',
      motivation: ['commenting', 'tagging'],
      target: feature,
      body: [{ type: 'TextualBody', purpose: 'identifying', value: 'Boundary' }],
    };
    const inlinePage = { id: ANNO_PAGE_URL, items: [geoAnno] };

    mockFetchResource.mockResolvedValue({ type: 'Manifest', data: {} });
    setManifestMock(makeManifestMock(CANVAS_URL, [inlinePage]));
    // maniiifest parses the page natively and yields the GeoJSON annotation.
    mockParseAnnotationPage.mockReturnValue(makeAnnotationPageParser([geoAnno]));
    mockParseAnnotation.mockReturnValue(
      makeAnnotationParser(
        [],
        [{ type: 'TextualBody', value: 'Boundary' }],
        [feature],
      ),
    );

    const result = await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('geo1');
    expect(result[0].motivation).toBe('commenting');
    expect(result[0].target[0].startsWith(`${CANVAS_URL}#svg=`)).toBe(true);
    expect((result[0].body as any[])[0].value).toBe('Boundary');

    const decoded = decodeURIComponent(result[0].target[0].split('#svg=')[1]);
    expect(decoded).toContain('<polygon');

    // The raw geographic geometry is also surfaced for the basemap in the list.
    expect(result[0].geo).toHaveLength(1);
    expect(result[0].geo![0].geometry).toEqual(feature.geometry);
  });

  it('attaches a GeoJSON Feature body to a canvas-fragment annotation (recipe 0139)', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    const featureBody = {
      id: 'https://example.com/geo.json',
      type: 'Feature',
      properties: { label: { en: ['Targeted Map'] } },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-77.02, 38.91], [-77.11, 38.84], [-77.28, 38.99], [-77.02, 38.91]]],
      },
    };
    const XYWH_TARGET = `${CANVAS_URL}#xywh=920,3600,1510,3000`;
    const geoAnno = {
      id: 'geoBody1',
      type: 'Annotation',
      motivation: 'tagging',
      body: featureBody,
      target: XYWH_TARGET,
    };
    const inlinePage = { id: ANNO_PAGE_URL, items: [geoAnno] };

    mockFetchResource.mockResolvedValue({ type: 'Manifest', data: {} });
    setManifestMock(makeManifestMock(CANVAS_URL, [inlinePage]));
    mockParseAnnotationPage.mockReturnValue(makeAnnotationPageParser([geoAnno]));
    // Single Feature body: no textual bodies, no target features, no feature
    // collection iteration; exposed via getAnnotationBody().
    mockParseAnnotation.mockReturnValue(
      makeAnnotationParser([XYWH_TARGET], [], [], [], featureBody),
    );

    const result = await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('geoBody1');
    expect(result[0].target).toEqual([XYWH_TARGET]);
    expect(result[0].geo).toHaveLength(1);
    expect(result[0].geo![0]).toMatchObject({
      label: 'Targeted Map',
      geometry: { type: 'Polygon' },
    });
  });

  it('skips georeferencing annotations (they define GCPs, not content)', async () => {
    const MANIFEST_URL = uniqueManifestUrl();
    const geoRefAnno = {
      id: 'georef1',
      type: 'Annotation',
      motivation: 'georeferencing',
      target: CANVAS_URL,
    };
    const inlinePage = { id: ANNO_PAGE_URL, items: [geoRefAnno] };

    mockFetchResource.mockResolvedValue({ type: 'Manifest', data: {} });
    setManifestMock(makeManifestMock(CANVAS_URL, [inlinePage]));
    mockParseAnnotationPage.mockReturnValue(makeAnnotationPageParser([geoRefAnno]));

    const result = await getAnnotationsForTarget(MANIFEST_URL, CANVAS_URL);

    expect(result).toHaveLength(0);
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