import { create } from 'zustand';
import { parseResource } from '../service/parser.ts';
import {
  IIIFCollection,
  IIIFManifest,
  IIIFAnnotation,
} from '../types/index.ts';
import { searchAnnotations } from '../service/search.ts';

interface IIIFState {
  activePanelTab: 'annotations' | 'searchResults';
  iiifContentUrl: string | null;
  currentManifest: IIIFManifest | null;
  currentCollection: IIIFCollection | null;
  canvasId: string;
  manifestUrls: string[];
  totalManifests: number;
  selectedManifestIndex: number;
  selectedImageIndex: number;
  annotations: IIIFAnnotation[];
  manifestMetadata: any;
  collectionMetadata: any;
  searchResults: any[];
  error: string | null;
  showUrlDialog: boolean;
  selectedAnnotation: IIIFAnnotation | null;
  pendingAnnotationId: string | null;
  selectedSearchResultId: string | null;
  viewerReady: boolean;
  autocompleteUrl: string;
  searchUrl: string;
  selectedLanguage: string | null;
  searching: boolean;

  setActivePanelTab: (tab: 'annotations' | 'searchResults') => void;
  setIiifContentUrl: (url: string | null) => void;
  setCurrentManifest: (manifest: IIIFManifest | null) => void;
  setCurrentCollection: (collection: IIIFCollection | null) => void;
  setCanvasId: (id: string) => void;
  setManifestUrls: (urls: string[]) => void;
  setTotalManifests: (total: number) => void;
  setSelectedManifestIndex: (index: number) => void;
  setSelectedImageIndex: (index: number) => void;
  setAnnotations: (annotations: IIIFAnnotation[]) => void;
  setManifestMetadata: (metadata: any) => void;
  setCollectionMetadata: (metadata: any) => void;
  setSearchResults: (results: any[]) => void;
  setError: (error: string | null) => void;
  setShowUrlDialog: (show: boolean) => void;
  setSelectedAnnotation: (annotation: IIIFAnnotation | null) => void;
  setPendingAnnotationId: (id: string | null) => void;
  setSelectedSearchResultId: (id: string | null) => void;
  setViewerReady: (ready: boolean) => void;
  setAutocompleteUrl: (url: string) => void;
  setSearchUrl: (url: string) => void;
  setSelectedLanguage: (language: string | null) => void;
  setSearching: (searching: boolean) => void;

  handleManifestUpdate: (
    firstManifest: IIIFManifest | null,
    manifestUrls: string[],
    total: number,
    collection: IIIFCollection | null,
  ) => void;
  handleSearch: (query: string) => Promise<void>;
  handleSearchResultClick: (
    canvasTarget: string,
    manifestId?: string,
    searchResultId?: string,
  ) => Promise<void>;
  fetchManifestByIndex: (index: number) => Promise<void>;
}

export const useIIIFStore = create<IIIFState>((set, get) => ({
  activePanelTab: 'annotations',
  iiifContentUrl: null,
  currentManifest: null,
  currentCollection: null,
  canvasId: '',
  manifestUrls: [],
  totalManifests: 0,
  selectedManifestIndex: 0,
  selectedImageIndex: 0,
  annotations: [],
  manifestMetadata: {},
  collectionMetadata: {},
  searchResults: [],
  error: null,
  showUrlDialog: false,
  selectedAnnotation: null,
  pendingAnnotationId: null,
  selectedSearchResultId: null,
  viewerReady: false,
  autocompleteUrl: '',
  searchUrl: '',
  selectedLanguage: 'en',
  searching: false,

  setActivePanelTab: (tab) => set({ activePanelTab: tab }),
  setIiifContentUrl: (url) => set({ iiifContentUrl: url }),
  setCurrentManifest: (manifest) => set({ currentManifest: manifest }),
  setCurrentCollection: (collection) => set({ currentCollection: collection }),
  setCanvasId: (id) => set({ canvasId: id }),
  setManifestUrls: (urls) => set({ manifestUrls: urls }),
  setTotalManifests: (total) => set({ totalManifests: total }),
  setSelectedManifestIndex: (index) => set({ selectedManifestIndex: index }),
  setSelectedImageIndex: (index) => set({ selectedImageIndex: index }),
  setAnnotations: (annotations) => set({ annotations: annotations }),
  setManifestMetadata: (metadata) => set({ manifestMetadata: metadata }),
  setCollectionMetadata: (metadata) => set({ collectionMetadata: metadata }),
  setSearchResults: (results) => set({ searchResults: results }),
  setError: (error) => set({ error: error }),
  setShowUrlDialog: (show) => set({ showUrlDialog: show }),
  setSelectedAnnotation: (annotation) =>
    set({ selectedAnnotation: annotation }),
  setPendingAnnotationId: (id) => set({ pendingAnnotationId: id }),
  setSelectedSearchResultId: (id) => set({ selectedSearchResultId: id }),
  setViewerReady: (ready) => set({ viewerReady: ready }),
  setAutocompleteUrl: (url) => set({ autocompleteUrl: url }),
  setSearchUrl: (url) => set({ searchUrl: url }),
  setSelectedLanguage: (language) => set({ selectedLanguage: language }),
  setSearching: (searching) => set({ searching: searching }),

  handleManifestUpdate: (firstManifest, manifestUrls, total, collection) => {
    set({
      currentManifest: firstManifest,
      manifestUrls: manifestUrls,
      totalManifests: total,
      manifestMetadata: {
        label: firstManifest?.info?.name || '',
        metadata: firstManifest?.info?.metadata || [],
        provider: firstManifest?.info?.provider || [],
        homepage: firstManifest?.info?.homepage || [],
        requiredStatement: firstManifest?.info?.requiredStatement,
      },
      currentCollection: collection ?? null,
      collectionMetadata: collection
        ? {
            label: collection.info.name || '',
            metadata: collection.info.metadata || [],
            provider: collection.info.provider || [],
            homepage: collection.info.homepage || [],
            requiredStatement: collection.info.requiredStatement,
          }
        : {},
      autocompleteUrl:
        collection?.collectionSearch?.autocomplete ??
        firstManifest?.manifestSearch?.autocomplete ??
        '',
      searchUrl:
        collection?.collectionSearch?.service ??
        firstManifest?.manifestSearch?.service ??
        '',
    });
  },

  handleSearch: async (query) => {
    if (get().searching) return;
    const trimmed = query.trim();
    if (!trimmed) return;
    if (!get().searchUrl) {
      set({ error: 'This resource does not support content search.' });
      return;
    }

    try {
      set({ searching: true });
      const searchEndpoint = `${get().searchUrl}?q=${encodeURIComponent(trimmed)}`;
      const results = await searchAnnotations(searchEndpoint);
      set({ searchResults: results, activePanelTab: 'searchResults' });
    } catch {
      set({ error: 'Search failed. Please try again.' });
    } finally {
      set({ searching: false });
    }
  },

  handleSearchResultClick: async (canvasTarget, manifestId, searchResultId) => {
    try {
      if (searchResultId) set({ selectedSearchResultId: searchResultId });
      let targetManifest = get().currentManifest;

      if (manifestId) {
        const matchedIndex = get().manifestUrls.findIndex((url) =>
          url.includes(manifestId),
        );
        if (matchedIndex === -1) {
          set({ error: 'Manifest not found.' });
          return;
        }

        const { firstManifest, collection } = await parseResource(
          get().manifestUrls[matchedIndex],
        );
        if (!firstManifest) {
          set({ error: 'Failed to load manifest.' });
          return;
        }

        set({
          selectedManifestIndex: matchedIndex,
          selectedImageIndex: 0,
          currentManifest: firstManifest,
          manifestMetadata: {
            label: firstManifest?.info?.name || '',
            metadata: firstManifest?.info?.metadata || [],
            provider: firstManifest?.info?.provider || [],
            homepage: firstManifest?.info?.homepage || [],
            requiredStatement: firstManifest?.info?.requiredStatement,
          },
          currentCollection: collection ?? null,
          collectionMetadata: collection
            ? {
                label: collection.info.name || '',
                metadata: collection.info.metadata || [],
                provider: collection.info.provider || [],
                homepage: collection.info.homepage || [],
                requiredStatement: collection.info.requiredStatement,
              }
            : {},
          autocompleteUrl:
            collection?.collectionSearch?.autocomplete ??
            firstManifest?.manifestSearch?.autocomplete ??
            '',
          searchUrl:
            collection?.collectionSearch?.service ??
            firstManifest?.manifestSearch?.service ??
            '',
        });

        targetManifest = firstManifest;
      }

      const baseCanvasTarget = canvasTarget.split('#')[0];
      const newImageIndex = targetManifest?.images.findIndex(
        (img) => img.canvasTarget === baseCanvasTarget,
      );
      if (newImageIndex === -1 || newImageIndex === undefined) {
        set({ error: 'Canvas not found.' });
        return;
      }

      set({
        viewerReady: false,
        selectedImageIndex: newImageIndex,
        canvasId: canvasTarget,
        activePanelTab: 'annotations',
      });
      if (searchResultId) set({ pendingAnnotationId: searchResultId });
    } catch (err) {
      console.error('Failed to jump to search result:', err);
      set({ error: 'Could not jump to search result.' });
    }
  },

  // ...existing code...
  fetchManifestByIndex: async (index) => {
    if (
      index < 0 ||
      index >= get().totalManifests ||
      index === get().selectedManifestIndex
    )
      return;
    const manifestUrl = get().manifestUrls[index];

    try {
      // The `collection` variable will be null here, which is the source of the issue.
      const { firstManifest } = await parseResource(manifestUrl);
      if (!firstManifest) {
        set({ error: 'Failed to load selected manifest.' });
        return;
      }
      set((state) => ({
        selectedAnnotation: null,
        annotations: [],
        searchResults: [],
        selectedSearchResultId: null,
        viewerReady: false,
        selectedManifestIndex: index,
        selectedImageIndex: 0,
        currentManifest: firstManifest,
        manifestMetadata: {
          label: firstManifest?.info?.name || '',
          metadata: firstManifest?.info?.metadata || [],
          provider: firstManifest?.info?.provider || [],
          homepage: firstManifest?.info?.homepage || [],
          requiredStatement: firstManifest?.info?.requiredStatement,
        },
        // --- FIX: Preserve existing collection context ---
        // Do not update the collection or its metadata. Keep the existing state.
        currentCollection: state.currentCollection,
        collectionMetadata: state.collectionMetadata,
        // Update search URLs, prioritizing the existing collection's search service
        autocompleteUrl:
          state.currentCollection?.collectionSearch?.autocomplete ??
          firstManifest?.manifestSearch?.autocomplete ??
          '',
        searchUrl:
          state.currentCollection?.collectionSearch?.service ??
          firstManifest?.manifestSearch?.service ??
          '',
      }));
    } catch (err) {
      console.error('Failed to fetch manifest by index:', err);
      set({ error: 'Failed to load selected manifest.' });
    }
  },
}));
