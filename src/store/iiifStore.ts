import { create } from 'zustand';
import { parseResource } from '../service/parser.ts';
import {
  IIIFCollection,
  IIIFManifest,
  IIIFAnnotation,
} from '../types/index.ts';
import { searchAnnotations } from '../service/search.ts';

interface IIIFState {
  activePanelTab: 'annotations' | 'search';
  iiifContentUrl: string | null;
  currentManifest: IIIFManifest | null;
  currentCollection: IIIFCollection | null;
  canvasId: string;
  manifestUrls: string[];
  totalManifests: number;
  selectedManifestIndex: number;
  selectedImageIndex: number;
  annotations: IIIFAnnotation[];
  annotationsForCanvasId: string | null;
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
  isNavigating: boolean;
  selectionPhase: 'idle' | 'pending' | 'waiting_viewer' | 'waiting_annotations' | 'ready' | 'selected' | 'failed';
  selectionDebug: boolean;
  selectionLog: string[];

  setActivePanelTab: (tab: 'annotations' | 'search') => void;
  setIiifContentUrl: (url: string | null) => void;
  setCurrentManifest: (manifest: IIIFManifest | null) => void;
  setCurrentCollection: (collection: IIIFCollection | null) => void;
  setCanvasId: (id: string) => void;
  setManifestUrls: (urls: string[]) => void;
  setTotalManifests: (total: number) => void;
  setSelectedManifestIndex: (index: number) => void;
  setSelectedImageIndex: (index: number) => void;
  setAnnotations: (annotations: IIIFAnnotation[], canvasId: string) => void;
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
  setNavigating: (isNavigating: boolean) => void;
  clearPendingAnnotation: () => void;
  selectPendingAnnotation: () => void;
  setSelectionDebug: (debug: boolean) => void;
  clearSelectionLog: () => void;

  handleManifestUpdate: (
    firstManifest: IIIFManifest | null,
    manifestUrls: string[],
    total: number,
    collection: IIIFCollection | null,
  ) => void;
  handleSearch: (query: string) => Promise<void>;
  handleSearchResultClick: (result: any) => Promise<void>;
  fetchManifestByIndex: (index: number, preserveSearchResults?: boolean) => Promise<void>;
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
  annotationsForCanvasId: null,
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
  isNavigating: false,
  selectionPhase: 'idle',
  selectionDebug: false,
  selectionLog: [],

  setActivePanelTab: (tab) => set({ activePanelTab: tab }),
  setIiifContentUrl: (url) => set({ iiifContentUrl: url }),
  setCurrentManifest: (manifest) => set({ currentManifest: manifest }),
  setCurrentCollection: (collection) => set({ currentCollection: collection }),
  setCanvasId: (id) => set({ canvasId: id }),
  setManifestUrls: (urls) => set({ manifestUrls: urls }),
  setTotalManifests: (total) => set({ totalManifests: total }),
  setSelectedManifestIndex: (index) => set({ selectedManifestIndex: index }),
  setSelectedImageIndex: (index: number) =>
    set({
      selectedImageIndex: index,
      selectedAnnotation: null,
      annotations: [],
      annotationsForCanvasId: null,
      viewerReady: false,
      selectionPhase: 'idle', // Reset selection phase
      pendingAnnotationId: null, // Clear any pending selection
    }),
  setAnnotations: (annotations, canvasId) => {
    set({ annotations: annotations, annotationsForCanvasId: canvasId });
    // Subscription will automatically handle selection evaluation
  },
  setManifestMetadata: (metadata) => set({ manifestMetadata: metadata }),
  setCollectionMetadata: (metadata) => set({ collectionMetadata: metadata }),
  setSearchResults: (results) => set({ searchResults: results }),
  setError: (error) => set({ error: error }),
  setShowUrlDialog: (show) => set({ showUrlDialog: show }),
  setSelectedAnnotation: (annotation) =>
    set({ selectedAnnotation: annotation }),
  setPendingAnnotationId: (id) => set({ pendingAnnotationId: id }),
  setSelectedSearchResultId: (id) => set({ selectedSearchResultId: id }),
  setViewerReady: (ready) => {
    set({ viewerReady: ready });
    // Subscription will automatically handle selection evaluation
  },
  setAutocompleteUrl: (url) => set({ autocompleteUrl: url }),
  setSearchUrl: (url) => set({ searchUrl: url }),
  setSelectedLanguage: (language) => set({ selectedLanguage: language }),
  setSearching: (searching) => set({ searching: searching }),
  setNavigating: (isNavigating) => set({ isNavigating }),
  setSelectionDebug: (debug) => set({ selectionDebug: debug }),
  clearSelectionLog: () => set({ selectionLog: [] }),

  clearPendingAnnotation: () => {
    set({ pendingAnnotationId: null, selectedSearchResultId: null });
  },

  selectPendingAnnotation: () => {
    // --- This logic is moved from the external helper function ---
    const {
      pendingAnnotationId,
      annotations,
      viewerReady,
      annotationsForCanvasId,
      canvasId,
      selectionPhase,
      selectionDebug,
    } = get();

    const debug = (msg: string) => {
      if (!selectionDebug) return;
      // Correctly update state via set() to prevent mutation
      set((state) => ({
        selectionLog: [...state.selectionLog.slice(-199), msg],
      }));
    };

    if (!pendingAnnotationId) {
      if (selectionPhase !== 'idle' && selectionPhase !== 'selected') {
        set({ selectionPhase: 'idle' });
      }
      return;
    }

    if (!viewerReady) {
      if (selectionPhase !== 'waiting_viewer') {
        debug(`Waiting for viewerReady for annotation ${pendingAnnotationId}`);
        set({ selectionPhase: 'waiting_viewer' });
      }
      return;
    }

    if (annotationsForCanvasId !== canvasId) {
      if (selectionPhase !== 'waiting_annotations') {
        debug(
          `Annotations not yet for current canvas (have ${annotationsForCanvasId} need ${canvasId})`,
        );
        set({ selectionPhase: 'waiting_annotations' });
      }
      return;
    }

    if (!annotations || annotations.length === 0) {
      if (selectionPhase !== 'waiting_annotations') {
        debug('Annotation array empty, waiting.');
        set({ selectionPhase: 'waiting_annotations' });
      }
      return;
    }

    if (selectionPhase !== 'ready' && selectionPhase !== 'pending') {
      set({ selectionPhase: 'ready' });
    }

    const match = annotations.find((a) => a.id === pendingAnnotationId);
    if (match) {
      debug(`Selected annotation ${pendingAnnotationId}`);
      set({
        selectedAnnotation: match,
        pendingAnnotationId: null,
        selectionPhase: 'selected',
      });
    } else {
      debug(`Failed to locate annotation ${pendingAnnotationId} among ${annotations.length}`);
      set({
        pendingAnnotationId: null,
        selectionPhase: 'failed',
      });
    }
  },

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
    const { searchUrl, manifestUrls } = get();
    if (!searchUrl) {
      set({ error: 'This resource does not support content search.' });
      return;
    }

    try {
      set({ searching: true });
      const searchEndpoint = `${searchUrl}?q=${encodeURIComponent(trimmed)}`;
      const results = await searchAnnotations(searchEndpoint);

      // --- Prioritize `partOf` and fall back to URL matching ---
      const taggedResults = results.map((result) => {
        let manifestId = '';

        // Step 1: Trust the `partOf` property if it's a valid manifest URL
        if (result.partOf) {
          const matchedUrl = manifestUrls.find(
            (url) => url === result.partOf,
          );
          if (matchedUrl) {
            manifestId = matchedUrl;
          }
        }

        // Step 2: If `partOf` was missing or invalid, fall back to prefix matching
        if (!manifestId) {
          const matchedUrl = manifestUrls.find((url) =>
            result.canvasTarget.startsWith(url),
          );
          if (matchedUrl) {
            manifestId = matchedUrl;
          }
        }

        return { ...result, manifestId: manifestId };
      });

      set({ searchResults: taggedResults, activePanelTab: 'search' });
    } catch {
      set({ error: 'Search failed. Please try again.' });
    } finally {
      set({ searching: false });
    }
  },

  handleSearchResultClick: async (result: any) => {
    const { manifestId, canvasTarget, annotationId } = result;
    const state = get();

    // Use the new isNavigating flag
    if (state.isNavigating) return;

    set({ 
      isNavigating: true, 
      selectedSearchResultId: result.id,
      selectionPhase: 'pending' // Set initial phase
    });

    try {
      // Helper function to perform the jump once the manifest is ready
      const jumpToResult = () => {
        const targetManifest = get().currentManifest;
        if (!targetManifest) {
          set({ error: 'No manifest loaded for search result.' });
          return;
        }

        const newImageIndex = targetManifest.images.findIndex(
          (img) => img.canvasTarget === canvasTarget,
        );

        if (newImageIndex === -1) {
          set({ error: 'Canvas for search result not found in manifest.' });
          return;
        }

        // If we are already on the correct image, just set the pending ID.
          if (
            newImageIndex === get().selectedImageIndex &&
            get().canvasId === canvasTarget
          ) {
            set({
              pendingAnnotationId: annotationId,
              selectedAnnotation: null,
              activePanelTab: 'annotations',
              selectionPhase: 'pending', // Re-assert phase for clarity
            });
          } else {
          // Otherwise, switch the image and set the pending ID.
          set({
            selectedImageIndex: newImageIndex,
            canvasId: canvasTarget,
            pendingAnnotationId: annotationId,
            selectedAnnotation: null,
            activePanelTab: 'annotations',
            viewerReady: false, // This will trigger the selection logic later
            selectionPhase: 'pending',
          });
          // No setTimeout needed; logic is now correctly triggered by setAnnotations/setViewerReady.
        }
      };

      // If the result is in a different manifest, fetch it first.
      if (
        manifestId &&
        manifestId !== state.manifestUrls[state.selectedManifestIndex]
      ) {
        const manifestIndex = state.manifestUrls.findIndex(
          (url) => url === manifestId,
        );
        if (manifestIndex !== -1) {
          await state.fetchManifestByIndex(manifestIndex, true);
          jumpToResult(); // Jump after the new manifest is loaded
        } else {
          set({ error: 'Manifest for search result not found.' });
        }
      } else {
        jumpToResult(); // Jump within the current manifest
      }
    } catch (err) {
      console.error('Failed to handle search result click:', err);
      set({ error: 'Could not jump to the selected search result.' });
    } finally {
      set({ isNavigating: false });
    }
  },

  fetchManifestByIndex: async (index, preserveSearchResults = false) => {
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
        annotationsForCanvasId: null, // Explicit reset to avoid stale canvas association
        viewerReady: false,
        selectedManifestIndex: index,
        selectedImageIndex: 0,
        currentManifest: firstManifest,
        searchResults: preserveSearchResults ? state.searchResults : [],
        selectedSearchResultId: preserveSearchResults ? state.selectedSearchResultId : null,
        pendingAnnotationId: null, // Always clear pending annotation when switching manifests
        selectionPhase: 'idle', // Reset selection phase
        manifestMetadata: {
          label: firstManifest?.info?.name || '',
          metadata: firstManifest?.info?.metadata || [],
          provider: firstManifest?.info?.provider || [],
          homepage: firstManifest?.info?.homepage || [],
          requiredStatement: firstManifest?.info?.requiredStatement,
        },
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

// Auto-trigger selection when conditions are met
let previousState = {
  pendingAnnotationId: null as string | null,
  annotations: [] as any[],
  viewerReady: false,
  annotationsForCanvasId: null as string | null,
  canvasId: null as string | null,
  selectionPhase: 'idle' as string,
};

useIIIFStore.subscribe((state) => {
  const current = {
    pendingAnnotationId: state.pendingAnnotationId,
    annotations: state.annotations,
    viewerReady: state.viewerReady,
    annotationsForCanvasId: state.annotationsForCanvasId,
    canvasId: state.canvasId,
    selectionPhase: state.selectionPhase,
  };
  
  // Only trigger if we have a pending annotation and conditions have changed
  if (!current.pendingAnnotationId) {
    previousState = current;
    return;
  }
  
  // Check if any of the key conditions changed and we might now be ready
  const conditionsChanged = 
    current.viewerReady !== previousState.viewerReady ||
    current.annotations !== previousState.annotations ||
    current.annotationsForCanvasId !== previousState.annotationsForCanvasId ||
    current.pendingAnnotationId !== previousState.pendingAnnotationId;
  
  if (conditionsChanged && 
      current.viewerReady && 
      current.annotations.length > 0 && 
      current.annotationsForCanvasId === current.canvasId &&
      (current.selectionPhase === 'pending' || current.selectionPhase === 'waiting_viewer' || current.selectionPhase === 'waiting_annotations')) {
    // Conditions are now met, trigger selection
    state.selectPendingAnnotation();
  }
  
  previousState = current;
});

// This function is now obsolete and can be removed.
/*
function evaluatePendingSelection() {
  ...
}
*/