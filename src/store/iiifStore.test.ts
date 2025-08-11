import { useIIIFStore } from './iiifStore';
import * as parser from '../service/parser';
import * as search from '../service/search';
import { act } from '@testing-library/react';

// Mock services
jest.mock('../service/parser');
jest.mock('../service/search');
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockParseResource = parser.parseResource as jest.Mock;
const mockSearchAnnotations = search.searchAnnotations as jest.Mock;

// Get the initial state for resetting before each test
const initialState = useIIIFStore.getState();

describe('useIIIFStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useIIIFStore.setState(initialState);
    });
    jest.clearAllMocks();
    // Suppress console logs for cleaner test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should have a correct initial state', () => {
    const state = useIIIFStore.getState();
    expect(state.iiifContentUrl).toBeNull();
    expect(state.currentManifest).toBeNull();
    expect(state.manifestUrls).toEqual([]);
    expect(state.totalManifests).toBe(0);
  });

  it('should set IIIF content URL via setIiifContentUrl', () => {
    const testUrl = 'https://example.com/manifest.json';
    act(() => {
      useIIIFStore.getState().setIiifContentUrl(testUrl);
    });
    expect(useIIIFStore.getState().iiifContentUrl).toBe(testUrl);
  });

  describe('handleManifestUpdate', () => {
    it('should update state correctly for a single manifest', () => {
      const mockManifest = {
        info: { name: 'Test Manifest' },
        canvases: [],
        images: [],
      };
      act(() => {
        useIIIFStore.getState().handleManifestUpdate(mockManifest as any, ['url1'], 1, null);
      });

      const state = useIIIFStore.getState();
      expect(state.currentManifest).toEqual(mockManifest);
      expect(state.manifestUrls).toEqual(['url1']);
      expect(state.totalManifests).toBe(1);
      expect(state.currentCollection).toBeNull();
      expect(state.manifestMetadata.label).toBe('Test Manifest');
    });

    it('should update state correctly for a collection', () => {
      const mockManifest = { info: { name: 'First Manifest' }, manifestSearch: { service: 'manifest-search' } };
      const mockCollection = { info: { name: 'Test Collection' }, collectionSearch: { service: 'collection-search' } };

      act(() => {
        useIIIFStore.getState().handleManifestUpdate(mockManifest as any, ['url1', 'url2'], 2, mockCollection as any);
      });

      const state = useIIIFStore.getState();
      expect(state.currentManifest).toEqual(mockManifest);
      expect(state.currentCollection).toEqual(mockCollection);
      expect(state.totalManifests).toBe(2);
      expect(state.manifestMetadata.label).toBe('First Manifest');
      expect(state.collectionMetadata.label).toBe('Test Collection');
      expect(state.searchUrl).toBe('collection-search'); // Collection search should take precedence
    });
  });

  describe('handleSearch', () => {
    it('should perform a search and update results', async () => {
      const mockResults = [
        {
          id: 'res1',
          exact: 'test',
          canvasTarget: 'http://example.com/canvas/1',
        },
      ];
      mockSearchAnnotations.mockResolvedValue(mockResults);

      act(() => {
        useIIIFStore.setState({ searchUrl: 'https://example.com/search' });
      });

      await act(async () => {
        await useIIIFStore.getState().handleSearch('test');
      });

      const state = useIIIFStore.getState();
      expect(mockSearchAnnotations).toHaveBeenCalledWith(
        'https://example.com/search?q=test', expect.any(Object)
      );

      const expectedResults = [
        {
          id: 'res1',
          exact: 'test',
          canvasTarget: 'http://example.com/canvas/1',
          manifestId: '', // The function adds this property
        },
      ];
      expect(state.searchResults).toEqual(expectedResults);

  expect(state.activePanelTab).toBe('search');
  expect(state.searchError).toBeNull();
    });

    it('should correctly tag results using partOf', async () => {
      const mockResults = [
        { id: 'res1', partOf: 'url1', canvasTarget: 'url1/canvas/1' },
      ];
      mockSearchAnnotations.mockResolvedValue(mockResults);

      act(() => {
        useIIIFStore.setState({
          searchUrl: 'https://example.com/search',
          manifestUrls: ['url1', 'url2'],
        });
      });

      await act(async () => {
        await useIIIFStore.getState().handleSearch('test');
      });

      const state = useIIIFStore.getState();
      expect(state.searchResults[0].manifestId).toBe('url1');
    });

    it('should filter out results with missing partOf when multiple manifests exist', async () => {
      const mockResults = [
        {
          id: 'res1',
          partOf: 'invalid_url',
          canvasTarget: 'url2/canvas/2',
          annotationId: 'anno1',
        },
      ];
      mockSearchAnnotations.mockResolvedValue(mockResults);

      act(() => {
        useIIIFStore.setState({
          searchUrl: 'https://example.com/search',
          manifestUrls: ['url1', 'url2'], // Multiple manifests
        });
      });

      await act(async () => {
        await useIIIFStore.getState().handleSearch('test');
      });

      const state = useIIIFStore.getState();
      // Result should be filtered out due to ambiguous manifest
      expect(state.searchResults).toHaveLength(0);
    });

    it('should use single manifest as fallback when partOf is missing', async () => {
      const mockResults = [
        {
          id: 'res1',
          partOf: 'invalid_url',
          canvasTarget: 'url1/canvas/1',
          annotationId: 'anno1',
        },
      ];
      mockSearchAnnotations.mockResolvedValue(mockResults);

      act(() => {
        useIIIFStore.setState({
          searchUrl: 'https://example.com/search',
          manifestUrls: ['url1'], // Single manifest
        });
      });

      await act(async () => {
        await useIIIFStore.getState().handleSearch('test');
      });

      const state = useIIIFStore.getState();
      expect(state.searchResults).toHaveLength(1);
      expect(state.searchResults[0].manifestId).toBe('url1');
    });

    it('should set an error if search fails', async () => {
      mockSearchAnnotations.mockRejectedValue(new Error('Search failed'));
      act(() => {
        useIIIFStore.setState({ searchUrl: 'https://example.com/search' });
      });

      await act(async () => {
        await useIIIFStore.getState().handleSearch('test');
      });

      const state = useIIIFStore.getState();
  expect(state.searchError?.message).toBe('Search failed');
      expect(state.searchResults).toEqual([]);
    });
  });

  describe('fetchManifestByIndex', () => {
    it('should fetch a new manifest and update state while preserving collection context', async () => {
      const initialCollection = { info: { name: 'My Collection' }, collectionSearch: { service: 'collection-search' } };
      const newManifest = { info: { name: 'Manifest 2' }, manifestSearch: { service: 'manifest2-search' } };

      mockParseResource.mockResolvedValue({ firstManifest: newManifest });

      act(() => {
        useIIIFStore.setState({
          selectedManifestIndex: 0,
          totalManifests: 2,
          manifestUrls: ['url1', 'url2'],
          currentCollection: initialCollection as any,
        });
      });

      await act(async () => {
        await useIIIFStore.getState().fetchManifestByIndex(1);
      });

      const state = useIIIFStore.getState();
      expect(mockParseResource).toHaveBeenCalledWith('url2');
      expect(state.selectedManifestIndex).toBe(1);
      expect(state.currentManifest).toEqual(newManifest);
      expect(state.currentCollection).toEqual(initialCollection); // Preserve collection
      expect(state.searchUrl).toBe('collection-search'); // Preserve collection search URL
    });
  });
});
