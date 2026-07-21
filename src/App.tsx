import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from './components/Header.tsx';
import SplashScreen from './components/SplashScreen.tsx';
import { getCanvasDimensions } from './service/canvas.ts';
import { IIIFAnnotation, IIIFManifest } from './types/index.ts';
import UrlDialog from './components/UrlDialog.tsx';
import ErrorDialog from './components/ErrorDialog.tsx';
import LeftPanel from './components/LeftPanel.tsx';
import MiddlePanel from './components/MiddlePanel.tsx';
import RightPanel from './components/RightPanel.tsx';
import { useIIIFStore } from './store/iiifStore.ts';
import { getAnnotationsForTarget } from './service/annotation.ts';
import { toUserMessage } from './errors/structured.ts';
import { parseResource } from './service/parser.ts';
import { logger } from './utils/logger.ts';
import { extractLanguagesFromAnnotations } from './utils/iiifLangUtils.ts';
import { DEFAULT_LANGUAGE } from './config/appConfig.ts';
import { isSafeHttpUrl } from './utils/contentState.ts';
import { useContentStateRestoration } from './components/useContentStateRestoration.ts';

const App: React.FC = () => {
  // Granular selectors for state
  const activePanelTab = useIIIFStore((state) => state.activePanelTab);
  const iiifContentUrl = useIIIFStore((state) => state.iiifContentUrl);
  const currentManifest = useIIIFStore((state) => state.currentManifest);
  const currentCollection = useIIIFStore((state) => state.currentCollection);
  const canvasId = useIIIFStore((state) => state.canvasId);
  const manifestUrls = useIIIFStore((state) => state.manifestUrls);
  const totalManifests = useIIIFStore((state) => state.totalManifests);
  const selectedManifestIndex = useIIIFStore(
    (state) => state.selectedManifestIndex,
  );
  const selectedImageIndex = useIIIFStore((state) => state.selectedImageIndex);
  const annotations = useIIIFStore((state) => state.annotations);
  const manifestMetadata = useIIIFStore((state) => state.manifestMetadata);
  const collectionMetadata = useIIIFStore((state) => state.collectionMetadata);
  const searchResults = useIIIFStore((state) => state.searchResults);
  const manifestError = useIIIFStore((state) => state.manifestError);
  const showUrlDialog = useIIIFStore((state) => state.showUrlDialog);
  const selectedAnnotation = useIIIFStore((state) => state.selectedAnnotation);
  const contentStateRegion = useIIIFStore((state) => state.contentStateRegion);
  const pendingAnnotationId = useIIIFStore(
    (state) => state.pendingAnnotationId,
  );
  const selectedSearchResultId = useIIIFStore(
    (state) => state.selectedSearchResultId,
  );
  const viewerReady = useIIIFStore((state) => state.viewerReady);
  const isSearchJump = useIIIFStore((state) => state.isSearchJump);
  const autocompleteUrl = useIIIFStore((state) => state.autocompleteUrl);
  const selectedLanguage = useIIIFStore((state) => state.selectedLanguage);
  const selectedMotivation = useIIIFStore((state) => state.selectedMotivation);
  const searching = useIIIFStore((state) => state.searching);
  const annotationsLoading = useIIIFStore((state) => state.annotationsLoading);
  const annotationsError = useIIIFStore((state) => state.annotationsError);
  const searchError = useIIIFStore((state) => state.searchError);
  const selectedChoices = useIIIFStore((state) => state.selectedChoices);

  // Granular selectors for actions
  const setActivePanelTab = useIIIFStore((state) => state.setActivePanelTab);
  const setIiifContentUrl = useIIIFStore((state) => state.setIiifContentUrl);
  const setCanvasId = useIIIFStore((state) => state.setCanvasId);
  const setAnnotationsLoading = useIIIFStore((state) => state.setAnnotationsLoading);
  const setSelectedImageIndex = useIIIFStore(
    (state) => state.setSelectedImageIndex,
  );
  const setAnnotations = useIIIFStore((state) => state.setAnnotations);
  const setManifestError = useIIIFStore((state) => state.setManifestError);
  const setAnnotationsError = useIIIFStore((state) => state.setAnnotationsError);
  const setShowUrlDialog = useIIIFStore((state) => state.setShowUrlDialog);
  const setSelectedAnnotation = useIIIFStore(
    (state) => state.setSelectedAnnotation,
  );
  const setSearchError = useIIIFStore((state) => state.setSearchError);
  const setViewerReady = useIIIFStore((state) => state.setViewerReady);
  const setAutocompleteUrl = useIIIFStore((state) => state.setAutocompleteUrl);
  const setSearchUrl = useIIIFStore((state) => state.setSearchUrl);
  const setSelectedLanguage = useIIIFStore(
    (state) => state.setSelectedLanguage,
  );
  const setSelectedMotivation = useIIIFStore(
    (state) => state.setSelectedMotivation,
  );
  const resetResourceContext = useIIIFStore(
    (state) => state.resetResourceContext,
  );
  const handleManifestUpdate = useIIIFStore(
    (state) => state.handleManifestUpdate,
  );
  const handleSearch = useIIIFStore((state) => state.handleSearch);
  const handleSearchResultClick = useIIIFStore(
    (state) => state.handleSearchResultClick,
  );
  const fetchManifestByIndex = useIIIFStore(
    (state) => state.fetchManifestByIndex,
  );
  const setChoiceIndex = useIIIFStore((state) => state.setChoiceIndex);

  const [searchParams, setSearchParams] = useSearchParams();
  const iiifContentUrlFromParams = searchParams.get('iiif-content');
  const mainRef = useRef<HTMLElement | null>(null);
  const liveNavRef = useRef<HTMLDivElement | null>(null);
  const liveErrorRef = useRef<HTMLDivElement | null>(null);

  // Restore viewer state (manifest → canvas → annotation) from the
  // self-contained iiif-content query parameter.
  useContentStateRestoration();

  useEffect(() => {
    if (iiifContentUrl && manifestUrls.length === 0) {
      parseResource(iiifContentUrl)
        .then(({ firstManifest, manifestUrls: urls, total, collection }) => {
          const manifestUrlsFinal =
            urls && urls.length > 0 ? urls : [iiifContentUrl];
          const totalFinal = typeof total === 'number' ? total : 1;
          handleManifestUpdate(
            firstManifest,
            manifestUrlsFinal,
            totalFinal,
            collection ?? null,
          );
        })
        .catch((err) => {
          logger.error('Failed to parse IIIF content:', err);
          setManifestError({ code: 'NETWORK_MANIFEST_FETCH', message: 'Failed to load IIIF content. Please check the URL.', at: Date.now(), recoverable: true });
        });
    }
  }, [iiifContentUrl, manifestUrls.length, handleManifestUpdate, setManifestError]);

  const handleUrlSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const rawInput = formData.get('iiifContentUrl');
    const input = (typeof rawInput === 'string' ? rawInput : '').trim();
    if (!input) return;

    try {
      const parsed = new URL(input);
      if (parsed.origin === window.location.origin) {
        const content = parsed.searchParams.get('iiif-content');
        if (content) {
          setSearchParams({ 'iiif-content': content });
          setShowUrlDialog(false);
          return;
        }
      }
    } catch {}

    if (input !== iiifContentUrl) {
      if (!isSafeHttpUrl(input)) {
        setManifestError({
          code: 'NETWORK_MANIFEST_FETCH',
          message: 'Unsupported IIIF content URL. Only http(s) URLs are allowed.',
          at: Date.now(),
          recoverable: true,
        });
        return;
      }
      resetResourceContext();
      setIiifContentUrl(input);
      setSearchParams({ 'iiif-content': input });
      setShowUrlDialog(false);
    }
  };

  // If the manifest declares a CanvasSequence (Range with behavior:sequence),
  // start the viewer on the first canvas of that sequence rather than the
  // first physical canvas. Runs once per manifest load — keyed on the manifest
  // identity — so it does not fight the user navigating back to image[0].
  const jumpedForManifestRef = useRef<IIIFManifest | null>(null);
  useEffect(() => {
    if (!currentManifest) return;
    if (jumpedForManifestRef.current === currentManifest) return;
    jumpedForManifestRef.current = currentManifest;
    const firstSequence = currentManifest.ranges?.[0];
    if (!firstSequence || firstSequence.canvasIds.length === 0) return;
    const firstSequenceCanvasId = firstSequence.canvasIds[0];
    if (currentManifest.images[0]?.canvasTarget === firstSequenceCanvasId) return;
    const targetIndex = currentManifest.images.findIndex(
      (img) => img.canvasTarget === firstSequenceCanvasId,
    );
    if (targetIndex > 0) setSelectedImageIndex(targetIndex);
  }, [currentManifest, setSelectedImageIndex]);

  // Guarded canvasId update to avoid redundant resets in store
  useEffect(() => {
    if (!currentManifest || selectedImageIndex < 0) return;
    // Strip any #xywh/#svg fragment: canvasId must be the bare canvas identity
    // (composition sub-images carry a fragment on their canvasTarget).
    const nextId = (
      currentManifest.images[selectedImageIndex]?.canvasTarget || ''
    ).replace(/#.*$/, '');
    if (nextId !== canvasId) {
      setCanvasId(nextId);
    }
  }, [currentManifest, selectedImageIndex, canvasId, setCanvasId]);

  // Annotation fetch with real AbortController propagation
  useEffect(() => {
    if (!currentManifest || !canvasId || manifestUrls.length === 0) return;
    const controller = new AbortController();
    const manifestUrl = manifestUrls[selectedManifestIndex];
    setAnnotationsLoading(true);
    getAnnotationsForTarget(manifestUrl, canvasId, controller.signal)
      .then((anns) => {
        setAnnotations(anns, canvasId);
      })
      .catch((err: any) => {
        if (err?.name === 'AbortError') return; // silent on navigation
        logger.error('Error fetching annotations:', err);
    setAnnotations([], canvasId);
    setAnnotationsError({ code: 'NETWORK_ANNOTATION_FETCH', message: toUserMessage(err) || 'Unable to load annotations for this canvas.', at: Date.now(), recoverable: true });
      });
    return () => controller.abort();
  }, [
    currentManifest,
    canvasId,
    selectedManifestIndex,
    manifestUrls,
    setAnnotations,
    setAnnotationsLoading,
  setAnnotationsError,
  ]);

  useEffect(() => {
    setAutocompleteUrl(
      currentCollection?.collectionSearch?.autocomplete ??
        currentManifest?.manifestSearch?.autocomplete ??
        '',
    );
    setSearchUrl(
      currentCollection?.collectionSearch?.service ??
        currentManifest?.manifestSearch?.service ??
        '',
    );
  }, [currentManifest, currentCollection, setAutocompleteUrl, setSearchUrl]);

  useEffect(() => {
    if (!iiifContentUrl && !iiifContentUrlFromParams) {
      setShowUrlDialog(true);
    }
  }, [iiifContentUrl, iiifContentUrlFromParams, setShowUrlDialog]);

  // Keep document language in sync with selectedLanguage
  useEffect(() => {
    if (!selectedLanguage) return;
    const prev = document.documentElement.getAttribute('lang');
    document.documentElement.setAttribute('lang', selectedLanguage);
    return () => {
      if (prev) document.documentElement.setAttribute('lang', prev);
    };
  }, [selectedLanguage]);

  // Toggle background inert/aria-hidden when a modal is open
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (!main) return;
    const active = showUrlDialog || !!manifestError;
    try {
      (main as any).inert = active;
    } catch {}
    if (active) main.setAttribute('aria-hidden', 'true');
    else main.removeAttribute('aria-hidden');
  }, [showUrlDialog, manifestError]);

  // Announce navigation changes and update title at top-level (must not be conditional)
  useEffect(() => {
    if (!currentManifest) return;
    // Count canvases, not images: a single canvas may carry multiple images
    // (IIIF composition/choice), so image count would over-report the total.
    const canvasIds = currentManifest.canvases.map((c) => c.id);
    const total = canvasIds.length;
    if (total <= 0) return;
    const canvasPos = canvasIds.indexOf(canvasId);
    const imagePosition = (canvasPos >= 0 ? canvasPos : selectedImageIndex) + 1;
    const titleBase = currentManifest?.info?.name || 'IIIF Resource';
    document.title = `${titleBase} – Image ${imagePosition} of ${total} – Tamerlane IIIF Viewer`;
    // Focus main region for SRs after navigation unless user is interacting in the panel or viewer
    const active = document.activeElement as HTMLElement | null;
    const panel = document.getElementById('panel-tabs');
    const viewer = document.getElementById('iiif-viewer');
    const isInPanel = !!(active && panel && (active === panel || panel.contains(active)));
    const isInViewer = !!(active && viewer && (active === viewer || viewer.contains(active)));
  if (!isInPanel && !isInViewer && !isSearchJump) {
      try {
        (mainRef.current as any)?.focus({ preventScroll: true });
      } catch {
        mainRef.current?.focus();
      }
    }
    // Announce via live region
    const el = liveNavRef.current;
    if (el) {
      el.textContent = `Image ${imagePosition} of ${total}`;
    }
  }, [currentManifest, selectedImageIndex, canvasId, isSearchJump]);

  // --- Language extraction and selection logic ---
  const availableLanguages = React.useMemo(() => {
    // This correctly returns [] if no languages are found, which drives our logic.
    return extractLanguagesFromAnnotations(annotations);
  }, [annotations]);

  useEffect(() => {
    // This logic correctly sets the selected language state based on what's available.
    if (availableLanguages.length > 0) {
      if (!availableLanguages.some((lang) => lang.code === selectedLanguage)) {
        setSelectedLanguage(availableLanguages[0].code);
      }
    } else if (annotations.length > 0) {
      if (selectedLanguage !== DEFAULT_LANGUAGE) {
        setSelectedLanguage(DEFAULT_LANGUAGE);
      }
    }
    // If annotations is an empty array (e.g., during loading), we do nothing and wait.
  }, [
    annotations.length, // Use length to avoid re-running on every annotation change
    availableLanguages,
    selectedLanguage,
    setSelectedLanguage,
  ]);

  // Create a safe list to pass to the Header component. It will never be empty.
  const languagesForHeader =
    availableLanguages.length > 0
      ? availableLanguages
      : [
          {
            code: DEFAULT_LANGUAGE,
            name: DEFAULT_LANGUAGE.toUpperCase(),
          },
        ];
  // --- End language logic ---

    // Selection logic now lives entirely in the store subscription (component effect removed).
  const handleAnnotationSelect = useCallback(
    (annotation: IIIFAnnotation) => {
      setSelectedAnnotation(annotation);
    },
    [setSelectedAnnotation],
  );

  // Store handles clearing pendingAnnotationId; no manual callback needed

  const handleLanguageChange = useCallback(
    (language: string) => setSelectedLanguage(language),
    [setSelectedLanguage],
  );

  const handleViewerReady = useCallback(() => {
    setViewerReady(true);
  }, [setViewerReady]);

  const handleImageLoadError = useCallback(
    (message: string) => {
      setAnnotationsError({ code: 'IMAGE_LOAD', message, at: Date.now(), recoverable: true });
    },
    [setAnnotationsError],
  );

  // Use the store's handleSearch, which uses searchUrl internally
  const onSearch = (query: string) => handleSearch(query);

  // All images for the current canvas, respecting Choice selections.
  // - Images without a choiceId are always shown (IIIF composition).
  // - Images with a choiceId are mutually exclusive; only the selected
  //   option for each group is included (IIIF Choice, recipe 0033).
  // Memoized so the array reference is stable and IIIFViewer's useEffect
  // does not rebuild OpenSeadragon on unrelated re-renders.
  const imagesForCanvas = useMemo(() => {
    if (!currentManifest || !canvasId) return [];
    const allForCanvas = currentManifest.images.filter(
      (img) => img.canvasTarget.replace(/#.*$/, '') === canvasId,
    );
    const choiceCounters = new Map<string, number>();
    return allForCanvas.filter((img) => {
      if (!img.choiceId) return true; // Composition image – always included
      const idx = choiceCounters.get(img.choiceId) ?? 0;
      choiceCounters.set(img.choiceId, idx + 1);
      return idx === (selectedChoices[img.choiceId] ?? 0);
    });
  }, [currentManifest, canvasId, selectedChoices]);

  // Derive the list of Choice groups for the floating UI buttons.
  const choiceGroups = useMemo(() => {
    if (!currentManifest || !canvasId) return [];
    const allForCanvas = currentManifest.images.filter(
      (img) => img.canvasTarget.replace(/#.*$/, '') === canvasId,
    );
    const map = new Map<string, Array<{ label: string; index: number }>>();
    const counters = new Map<string, number>();
    for (const img of allForCanvas) {
      if (!img.choiceId) continue;
      const idx = counters.get(img.choiceId) ?? 0;
      counters.set(img.choiceId, idx + 1);
      if (!map.has(img.choiceId)) map.set(img.choiceId, []);
      map.get(img.choiceId)!.push({ label: img.choiceLabel ?? `Option ${idx + 1}`, index: idx });
    }
    return Array.from(map.entries()).map(([choiceId, options]) => ({
      choiceId,
      options,
      selectedIndex: selectedChoices[choiceId] ?? 0,
    }));
  }, [currentManifest, canvasId, selectedChoices]);

  if (showUrlDialog) {
    return <UrlDialog onSubmit={handleUrlSubmit} />;
  }
  if (manifestError) {
    return (
      <ErrorDialog
        message={manifestError.message}
        onDismiss={() => {
          setManifestError(null);
          // Reset state to go back to the URL dialog
          setIiifContentUrl(null);
          handleManifestUpdate(null, [], 0, null);
          setShowUrlDialog(true);
        }}
      />
    );
  }

  if (searchError && searchError.code !== 'SEARCH_VALIDATION') {
    return (
      <ErrorDialog
        message={searchError.message}
        onDismiss={() => {
          setSearchError(null);
        }}
      />
    );
  }

  if (!currentManifest) return <SplashScreen />;

  // Active canvas sequence: if the manifest declares one or more meaningful
  // ranges (already filtered by the parser to exclude empty ranges and those
  // matching default order), follow the first. The viewer only supports
  // linear navigation, so additional ranges are ignored.
  const defaultCanvasIds = currentManifest.canvases.map((c) => c.id);
  const manifestRanges = currentManifest.ranges ?? [];
  const activeRange = manifestRanges[0] ?? null;
  if (manifestRanges.length > 1) {
    logger.debug(
      `Manifest has ${manifestRanges.length} ranges; using first ("${activeRange?.label ?? activeRange?.id}") and ignoring the rest.`,
    );
  }
  const activeCanvasIds = activeRange ? activeRange.canvasIds : defaultCanvasIds;
  const activePosition = (() => {
    const i = activeCanvasIds.indexOf(canvasId);
    return i >= 0 ? i : 0;
  })();
  const activeLength = activeCanvasIds.length;
  const goToActivePosition = (pos: number) => {
    if (activeLength === 0) return;
    const wrapped = ((pos % activeLength) + activeLength) % activeLength;
    const targetCanvasId = activeCanvasIds[wrapped];
    const imgIndex = currentManifest.images.findIndex(
      (img) => img.canvasTarget === targetCanvasId,
    );
    if (imgIndex >= 0) setSelectedImageIndex(imgIndex);
  };

  const totalImages = currentManifest.images.length;
  if (totalImages === 0) {
    return (
      <div className="text-center mt-10 text-gray-500">
        No images available in this manifest.
      </div>
    );
  }

  let canvasWidth: number | undefined;
  let canvasHeight: number | undefined;

  try {
    if (canvasId) {
      const canvas = getCanvasDimensions(currentManifest, canvasId);
      canvasWidth = canvas.canvasWidth ?? 1000;
      canvasHeight = canvas.canvasHeight ?? 1000;
    }
  } catch (error) {
    logger.warn('Error retrieving canvas dimensions:', error);
  }

  return (
    <div className="flex flex-col h-screen min-h-0">
      <a
        href="#main-content"
        className="govuk-skip-link"
      >
        Skip to main content
      </a>
      <Header
        onSearch={onSearch}
        autocompleteUrl={autocompleteUrl}
        searching={searching}
        currentIndex={activePosition}
        totalImages={activeLength}
        totalManifests={totalManifests}
        selectedManifestIndex={selectedManifestIndex}
        onPreviousImage={() => goToActivePosition(activePosition - 1)}
        onNextImage={() => goToActivePosition(activePosition + 1)}
        onPreviousManifest={() =>
          fetchManifestByIndex(
            selectedManifestIndex > 0
              ? selectedManifestIndex - 1
              : totalManifests - 1,
          )
        }
        onNextManifest={() =>
          fetchManifestByIndex(
            selectedManifestIndex < totalManifests - 1
              ? selectedManifestIndex + 1
              : 0,
          )
        }
        resetImageIndex={() => setSelectedImageIndex(0)}
        onLanguageChange={handleLanguageChange}
        selectedLanguage={selectedLanguage}
        availableLanguages={languagesForHeader}
        selectedMotivation={selectedMotivation}
        onMotivationSelect={setSelectedMotivation}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-grow min-h-0 overflow-hidden"
        ref={mainRef}
        aria-label="IIIF Viewer content"
      >
        <div ref={liveNavRef} aria-live="polite" aria-atomic="true" className="sr-only" />
        <div ref={liveErrorRef} aria-live="polite" aria-atomic="true" className="sr-only">
          {!searchError && !manifestError ? (annotationsError?.message || '') : ''}
        </div>
        <LeftPanel
          manifestMetadata={manifestMetadata}
          collectionMetadata={collectionMetadata}
        />
        <MiddlePanel
          images={imagesForCanvas}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          choiceGroups={choiceGroups}
          onChoiceSelect={setChoiceIndex}
          selectedAnnotation={selectedAnnotation}
          regionTarget={contentStateRegion}
          onViewerReady={handleViewerReady}
          onImageLoadError={handleImageLoadError}
        />
        <RightPanel
          annotations={annotations}
          searchResults={searchResults}
          activeTab={activePanelTab}
          setActiveTab={setActivePanelTab}
          onAnnotationSelect={handleAnnotationSelect}
          onResultClick={handleSearchResultClick}
          selectedAnnotation={selectedAnnotation || undefined}
          selectedSearchResultId={selectedSearchResultId || undefined}
          selectedLanguage={selectedLanguage || undefined}
          selectedMotivation={selectedMotivation}
          pendingAnnotationId={pendingAnnotationId}
          onPendingAnnotationProcessed={() => {}} // Store handles this automatically now
          viewerReady={viewerReady}
          annotationsLoading={annotationsLoading}
          searching={searching}
        />
    </main>
    </div>
  );
};

export default App;
