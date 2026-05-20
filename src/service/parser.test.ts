import { parseResource } from './parser';
import * as resource from './resource';
import * as image from './image';
import { Maniiifest } from 'maniiifest';
import { TamerlaneParseError } from '../errors';

// Mock dependencies
jest.mock('./resource');
jest.mock('./image');
jest.mock('maniiifest');

const mockFetchResource = resource.fetchResource as jest.Mock;
const mockGetImage = image.getImage as jest.Mock;
const mockManiiifest = Maniiifest as jest.Mock;
const mockParseAnnotation = Maniiifest.parseAnnotation as jest.Mock;

type ManifestFixture = {
  id: string;
  label?: string;
  canvases?: string[];
  ranges?: any[]; // raw range objects to be yielded by iterateManifestRange
};

type CollectionFixture = {
  id: string;
  label?: string;
  // items in document order — each is either a Manifest ref or a Collection ref
  items: Array<
    | { type: 'Manifest'; id: string }
    | { type: 'Collection'; id: string; items?: any[] }
  >;
};

// Build a Maniiifest mock that dispatches based on the input data shape.
function installManiiifestMock(opts: {
  manifests?: ManifestFixture[];
  collections?: CollectionFixture[];
}) {
  const manifestById = new Map((opts.manifests ?? []).map((m) => [m.id, m]));
  const collectionById = new Map((opts.collections ?? []).map((c) => [c.id, c]));

  mockManiiifest.mockImplementation((data: any) => {
    // Manifest reference (used inside iterateCollectionManifest results)
    if (data?.type === 'Manifest' && !manifestById.has(data.id)) {
      return { getManifestId: () => data.id };
    }
    // Collection reference object (rare path inside iterateCollectionCollection
    // when wrapped in a Maniiifest in user code — not used by parser today)
    if (data?.type === 'Collection' && collectionById.has(data.id)) {
      const fx = collectionById.get(data.id)!;
      return collectionMockFor(fx);
    }
    if (data?.type === 'Manifest' && manifestById.has(data.id)) {
      return manifestMockFor(manifestById.get(data.id)!);
    }
    if (data?.type === 'Collection') {
      // Inline collection without a registered fixture — treat as empty
      return collectionMockFor({ id: data.id ?? 'inline', items: [] });
    }
    throw new Error(`Unexpected Maniiifest input: ${JSON.stringify(data)}`);
  });
}

function manifestMockFor(fx: ManifestFixture) {
  const canvases = (fx.canvases ?? []).map((id) => ({ id }));
  return {
    getSpecificationType: () => 'Manifest',
    getManifestId: () => fx.id,
    getManifestLabel: () => ({ en: [fx.label ?? fx.id] }),
    iterateManifestMetadata: () => [],
    iterateManifestProvider: () => [],
    iterateManifestHomepage: () => [],
    getManifestRequiredStatement: () => null,
    iterateManifestCanvas: () => canvases,
    iterateManifestCanvasAnnotation: () => [],
    getManifestService: () => null,
    iterateManifestRange: () => fx.ranges ?? [],
  };
}

function collectionMockFor(fx: CollectionFixture) {
  const manifestItems = fx.items.filter((i) => i.type === 'Manifest');
  const collectionItems = fx.items.filter((i) => i.type === 'Collection');
  return {
    getSpecificationType: () => 'Collection',
    getCollectionLabel: () => ({ en: [fx.label ?? fx.id] }),
    iterateCollectionMetadata: () => [],
    iterateCollectionProvider: () => [],
    iterateCollectionHomepage: () => [],
    getCollectionRequiredStatement: () => null,
    getCollectionService: () => null,
    iterateCollectionManifest: () => manifestItems,
    iterateCollectionCollection: () => collectionItems,
  };
}

// URL-keyed fetchResource dispatcher.
function installFetchMock(
  manifests: ManifestFixture[],
  collections: CollectionFixture[],
) {
  const byUrl = new Map<string, { type: string; data: any }>();
  for (const m of manifests) {
    byUrl.set(m.id, { type: 'Manifest', data: { id: m.id, type: 'Manifest' } });
  }
  for (const c of collections) {
    byUrl.set(c.id, {
      type: 'Collection',
      data: { id: c.id, type: 'Collection', items: c.items },
    });
  }
  mockFetchResource.mockImplementation(async (url: string) => {
    const hit = byUrl.get(url);
    if (!hit) throw new Error(`Unexpected fetchResource URL: ${url}`);
    return hit;
  });
}

describe('parseResource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetImage.mockReturnValue({ imageUrl: 'image-url', imageType: 'iiif' });
    mockParseAnnotation.mockReturnValue({
      iterateAnnotationTarget: () => [],
      iterateAnnotationResourceBody: () => [],
    });
  });

  it('parses a single manifest', async () => {
    const m: ManifestFixture = { id: 'm1', label: 'M1', canvases: ['c1', 'c2'] };
    installFetchMock([m], []);
    installManiiifestMock({ manifests: [m] });

    const result = await parseResource('m1');

    expect(result.firstManifest?.info.name).toBe('M1');
    expect(result.manifestUrls).toEqual(['m1']);
    expect(result.total).toBe(1);
    expect(result.collection).toBeUndefined();
    expect(result.firstManifest?.ranges).toBeUndefined();
  });

  it('parses a flat collection', async () => {
    const m1: ManifestFixture = { id: 'm1' };
    const c: CollectionFixture = {
      id: 'c1',
      label: 'C1',
      items: [{ type: 'Manifest', id: 'm1' }],
    };
    installFetchMock([m1], [c]);
    installManiiifestMock({ manifests: [m1], collections: [c] });

    const result = await parseResource('c1');

    expect(result.manifestUrls).toEqual(['m1']);
    expect(result.firstManifest).toBeDefined();
    expect(result.collection?.info.name).toBe('C1');
  });

  it('throws for unknown resource types', async () => {
    mockFetchResource.mockResolvedValue({ type: 'Unknown', data: {} });
    await expect(parseResource('x')).rejects.toThrow(
      new TamerlaneParseError('Unknown IIIF resource type'),
    );
  });

  describe('collection traversal', () => {
    it('descends into sub-collections that are siblings of manifests (regression)', async () => {
      // Bug fix: previously, if a Collection level contained any manifests,
      // sibling sub-collections were skipped entirely.
      const m1: ManifestFixture = { id: 'm1' };
      const m2: ManifestFixture = { id: 'm2' };
      const child: CollectionFixture = {
        id: 'c-child',
        items: [{ type: 'Manifest', id: 'm2' }],
      };
      const root: CollectionFixture = {
        id: 'c-root',
        items: [
          { type: 'Manifest', id: 'm1' },
          { type: 'Collection', id: 'c-child' },
        ],
      };
      installFetchMock([m1, m2], [root, child]);
      installManiiifestMock({ manifests: [m1, m2], collections: [root, child] });

      const result = await parseResource('c-root');

      expect(result.manifestUrls).toEqual(['m1', 'm2']);
      expect(result.total).toBe(2);
    });

    it('flattens deeply nested collections depth-first in document order', async () => {
      const m1: ManifestFixture = { id: 'm1' };
      const m2: ManifestFixture = { id: 'm2' };
      const m3: ManifestFixture = { id: 'm3' };
      const m4: ManifestFixture = { id: 'm4' };
      const inner: CollectionFixture = {
        id: 'c-inner',
        items: [
          { type: 'Manifest', id: 'm2' },
          { type: 'Manifest', id: 'm3' },
        ],
      };
      const root: CollectionFixture = {
        id: 'c-root',
        items: [
          { type: 'Manifest', id: 'm1' },
          { type: 'Collection', id: 'c-inner' },
          { type: 'Manifest', id: 'm4' },
        ],
      };
      installFetchMock([m1, m2, m3, m4], [root, inner]);
      installManiiifestMock({
        manifests: [m1, m2, m3, m4],
        collections: [root, inner],
      });

      const result = await parseResource('c-root');

      expect(result.manifestUrls).toEqual(['m1', 'm2', 'm3', 'm4']);
    });

    it('fetches sub-collection references when items are absent', async () => {
      const m1: ManifestFixture = { id: 'm1' };
      const child: CollectionFixture = {
        id: 'c-child',
        items: [{ type: 'Manifest', id: 'm1' }],
      };
      const root: CollectionFixture = {
        id: 'c-root',
        // Sub-collection reference without inline items — spec-conformant.
        items: [{ type: 'Collection', id: 'c-child' }],
      };
      installFetchMock([m1], [root, child]);
      installManiiifestMock({ manifests: [m1], collections: [root, child] });

      const result = await parseResource('c-root');

      expect(result.manifestUrls).toEqual(['m1']);
      expect(mockFetchResource).toHaveBeenCalledWith('c-child');
    });

    it('hydrates firstManifest from manifestUrls[0] in document order', async () => {
      // The eager-during-recursion bug could pick the wrong "first" manifest
      // when the traversal order was broken. Verify the first URL wins.
      const m1: ManifestFixture = { id: 'm1', label: 'First' };
      const m2: ManifestFixture = { id: 'm2', label: 'Second' };
      const root: CollectionFixture = {
        id: 'c-root',
        items: [
          { type: 'Manifest', id: 'm1' },
          { type: 'Manifest', id: 'm2' },
        ],
      };
      installFetchMock([m1, m2], [root]);
      installManiiifestMock({ manifests: [m1, m2], collections: [root] });

      const result = await parseResource('c-root');

      expect(result.manifestUrls[0]).toBe('m1');
      expect(result.firstManifest?.info.name).toBe('First');
    });

    it('detects cycles in nested collections', async () => {
      const m1: ManifestFixture = { id: 'm1' };
      // Root references child; child references root → cycle.
      const child: CollectionFixture = {
        id: 'c-child',
        items: [
          { type: 'Manifest', id: 'm1' },
          { type: 'Collection', id: 'c-root' },
        ],
      };
      const root: CollectionFixture = {
        id: 'c-root',
        items: [{ type: 'Collection', id: 'c-child' }],
      };
      installFetchMock([m1], [root, child]);
      installManiiifestMock({ manifests: [m1], collections: [root, child] });

      const result = await parseResource('c-root');

      expect(result.manifestUrls).toEqual(['m1']);
      // Each collection fetched at most once.
      const childFetches = mockFetchResource.mock.calls.filter(
        ([u]) => u === 'c-child',
      ).length;
      const rootFetches = mockFetchResource.mock.calls.filter(
        ([u]) => u === 'c-root',
      ).length;
      expect(childFetches).toBe(1);
      expect(rootFetches).toBe(1);
    });

    it('returns empty results for an empty collection', async () => {
      const root: CollectionFixture = { id: 'c-root', items: [] };
      installFetchMock([], [root]);
      installManiiifestMock({ collections: [root] });

      const result = await parseResource('c-root');

      expect(result.manifestUrls).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.firstManifest).toBeNull();
      expect(result.collection).toBeDefined();
    });
  });

  describe('ranges', () => {
    it('omits ranges that mirror the default canvas order', async () => {
      const m: ManifestFixture = {
        id: 'm1',
        canvases: ['c1', 'c2', 'c3'],
        ranges: [
          {
            id: 'r-toc',
            type: 'Range',
            behavior: ['sequence'],
            label: { en: ['ToC'] },
            items: [
              { id: 'c1', type: 'Canvas' },
              { id: 'c2', type: 'Canvas' },
              { id: 'c3', type: 'Canvas' },
            ],
          },
        ],
      };
      installFetchMock([m], []);
      installManiiifestMock({ manifests: [m] });

      const result = await parseResource('m1');

      expect(result.firstManifest?.ranges).toBeUndefined();
    });

    it('exposes ranges that reorder canvases', async () => {
      const m: ManifestFixture = {
        id: 'm1',
        canvases: ['c1', 'c2', 'c3'],
        ranges: [
          {
            id: 'r-reverse',
            type: 'Range',
            behavior: ['sequence'],
            label: { en: ['Reverse'] },
            items: [
              { id: 'c3', type: 'Canvas' },
              { id: 'c2', type: 'Canvas' },
              { id: 'c1', type: 'Canvas' },
            ],
          },
        ],
      };
      installFetchMock([m], []);
      installManiiifestMock({ manifests: [m] });

      const result = await parseResource('m1');

      expect(result.firstManifest?.ranges).toEqual([
        { id: 'r-reverse', label: 'Reverse', canvasIds: ['c3', 'c2', 'c1'] },
      ]);
    });

    it('exposes opt-in sequence ranges that are a subset of the default order', async () => {
      const m: ManifestFixture = {
        id: 'm1',
        canvases: ['c1', 'c2', 'c3'],
        ranges: [
          {
            id: 'r-subset',
            type: 'Range',
            behavior: ['sequence'],
            label: { en: ['Subset'] },
            items: [
              { id: 'c1', type: 'Canvas' },
              { id: 'c3', type: 'Canvas' },
            ],
          },
        ],
      };
      installFetchMock([m], []);
      installManiiifestMock({ manifests: [m] });

      const result = await parseResource('m1');

      expect(result.firstManifest?.ranges).toEqual([
        { id: 'r-subset', label: 'Subset', canvasIds: ['c1', 'c3'] },
      ]);
    });

    it('ignores structural ranges without behavior:sequence (regression)', async () => {
      // Wellcome-style: top-level structures are ToC sections (e.g. "Cover")
      // each containing a single Canvas. Treating them as nav sequences
      // collapsed the manifest to one canvas.
      const m: ManifestFixture = {
        id: 'm1',
        canvases: ['c1', 'c2', 'c3'],
        ranges: [
          {
            id: 'r-cover',
            type: 'Range',
            label: { en: ['Cover'] },
            items: [{ id: 'c1', type: 'Canvas' }],
          },
          {
            id: 'r-body',
            type: 'Range',
            label: { en: ['Body'] },
            items: [
              { id: 'c2', type: 'Canvas' },
              { id: 'c3', type: 'Canvas' },
            ],
          },
        ],
      };
      installFetchMock([m], []);
      installManiiifestMock({ manifests: [m] });

      const result = await parseResource('m1');

      expect(result.firstManifest?.ranges).toBeUndefined();
    });

    it('flattens sub-ranges depth-first', async () => {
      const m: ManifestFixture = {
        id: 'm1',
        canvases: ['c1', 'c2', 'c3', 'c4'],
        ranges: [
          {
            id: 'r-top',
            type: 'Range',
            behavior: ['sequence'],
            label: { en: ['Top'] },
            items: [
              {
                id: 'r-sub-a',
                type: 'Range',
                items: [
                  { id: 'c4', type: 'Canvas' },
                  { id: 'c3', type: 'Canvas' },
                ],
              },
              {
                id: 'r-sub-b',
                type: 'Range',
                items: [
                  { id: 'c2', type: 'Canvas' },
                  { id: 'c1', type: 'Canvas' },
                ],
              },
            ],
          },
        ],
      };
      installFetchMock([m], []);
      installManiiifestMock({ manifests: [m] });

      const result = await parseResource('m1');

      expect(result.firstManifest?.ranges?.[0].canvasIds).toEqual([
        'c4',
        'c3',
        'c2',
        'c1',
      ]);
    });

    it('strips fragment selectors from canvas ids and handles SpecificResource', async () => {
      const m: ManifestFixture = {
        id: 'm1',
        canvases: ['c1', 'c2'],
        ranges: [
          {
            id: 'r-frag',
            type: 'Range',
            behavior: ['sequence'],
            label: { en: ['Frag'] },
            items: [
              { id: 'c2#xywh=0,0,10,10', type: 'Canvas' },
              {
                type: 'SpecificResource',
                source: 'c1#xywh=5,5,20,20',
              },
            ],
          },
        ],
      };
      installFetchMock([m], []);
      installManiiifestMock({ manifests: [m] });

      const result = await parseResource('m1');

      expect(result.firstManifest?.ranges?.[0].canvasIds).toEqual(['c2', 'c1']);
    });

    it('drops ranges that yield no canvases', async () => {
      const m: ManifestFixture = {
        id: 'm1',
        canvases: ['c1'],
        ranges: [
          {
            id: 'r-empty',
            type: 'Range',
            behavior: ['sequence'],
            label: { en: ['Empty'] },
            items: [],
          },
        ],
      };
      installFetchMock([m], []);
      installManiiifestMock({ manifests: [m] });

      const result = await parseResource('m1');

      expect(result.firstManifest?.ranges).toBeUndefined();
    });
  });
});
