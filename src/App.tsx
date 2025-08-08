import React, { useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from './components/Header.tsx';
import SplashScreen from './components/SplashScreen.tsx';
import { getCanvasDimensions } from './service/canvas.ts';
import { IIIFAnnotation } from './types/index.ts';
import UrlDialog from './components/UrlDialog.tsx';
import ErrorDialog from './components/ErrorDialog.tsx';
import LeftPanel from './components/LeftPanel.tsx';
import MiddlePanel from './components/MiddlePanel.tsx';
import RightPanel from './components/RightPanel.tsx';
import { useIIIFStore } from './store/iiifStore.ts';
import { getAnnotationsForTarget } from './service/annotation.ts';
import { toUserMessage } from './errors/structured.ts';
import { parseResource } from './service/parser.ts';
import { extractLanguagesFromAnnotations } from './utils/iiifLangUtils.ts';
import { availableLanguages as configLanguages } from './config/appConfig.ts';

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
  const pendingAnnotationId = useIIIFStore(
    (state) => state.pendingAnnotationId,
  );
  const selectedSearchResultId = useIIIFStore(
    (state) => state.selectedSearchResultId,
  );
  const viewerReady = useIIIFStore((state) => state.viewerReady);
  const autocompleteUrl = useIIIFStore((state) => state.autocompleteUrl);
  const selectedLanguage = useIIIFStore((state) => state.selectedLanguage);
  const searching = useIIIFStore((state) => state.searching);

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
  const setViewerReady = useIIIFStore((state) => state.setViewerReady);
  const setAutocompleteUrl = useIIIFStore((state) => state.setAutocompleteUrl);
  const setSearchUrl = useIIIFStore((state) => state.setSearchUrl);
  const setSelectedLanguage = useIIIFStore(
    (state) => state.setSelectedLanguage,
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

  const [searchParams, setSearchParams] = useSearchParams();
  const iiifContentUrlFromParams = searchParams.get('iiif-content');

  useEffect(() => {
    if (iiifContentUrlFromParams) {
      setIiifContentUrl(iiifContentUrlFromParams);
    }
  }, [iiifContentUrlFromParams, setIiifContentUrl]);

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
        .catch((err) =>
          setManifestError({ code: 'NETWORK_MANIFEST_FETCH', message: 'Failed to load IIIF content. Please check the URL.', at: Date.now(), recoverable: true }),
        );
    }
  }, [iiifContentUrl, manifestUrls.length, handleManifestUpdate, setManifestError]);

  const handleUrlSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const url = formData.get('iiifContentUrl') as string;
    if (url !== iiifContentUrl) {
      setIiifContentUrl(url);
      setSearchParams({ 'iiif-content': url });
      setShowUrlDialog(false);
    }
  };

  // Guarded canvasId update to avoid redundant resets in store
  useEffect(() => {
    if (!currentManifest || selectedImageIndex < 0) return;
    const nextId = currentManifest.images[selectedImageIndex]?.canvasTarget || '';
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
        console.error('Error fetching annotations:', err);
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

  // --- Language extraction and selection logic ---
  const DEFAULT_LANGUAGE = configLanguages[0]?.code || 'en';
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
    DEFAULT_LANGUAGE,
  ]);

  // Create a safe list to pass to the Header component. It will never be empty.
  const languagesForHeader =
    availableLanguages.length > 0
      ? availableLanguages
      : [
          {
            code: DEFAULT_LANGUAGE,
            name: configLanguages[0]?.name || 'English',
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

  if (showUrlDialog) return <UrlDialog onSubmit={handleUrlSubmit} />;
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

  if (!currentManifest) return <SplashScreen />;

  const totalImages = currentManifest.images.length;
  if (totalImages === 0) {
    return (
      <div className="text-center mt-10 text-gray-500">
        No images available in this manifest.
      </div>
    );
  }

  const selectedImage = currentManifest.images[selectedImageIndex];
  let canvasWidth: number | undefined;
  let canvasHeight: number | undefined;

  try {
    if (canvasId) {
      const canvas = getCanvasDimensions(currentManifest, canvasId);
      canvasWidth = canvas.canvasWidth ?? 1000;
      canvasHeight = canvas.canvasHeight ?? 1000;
    }
  } catch (error) {
    console.warn('Error retrieving canvas dimensions:', error);
  }

  const imageUrl = selectedImage?.imageUrl ?? '';
  const imageType = selectedImage?.imageType ?? 'standard';
  const imageWidth = selectedImage?.imageWidth ?? canvasWidth;
  const imageHeight = selectedImage?.imageHeight ?? canvasHeight;

  return (
    <div className="flex flex-col h-screen">
      <Header
        onSearch={onSearch}
        autocompleteUrl={autocompleteUrl}
        searching={searching}
        currentIndex={selectedImageIndex}
        totalImages={totalImages}
        totalManifests={totalManifests}
        selectedManifestIndex={selectedManifestIndex}
        onPreviousImage={() =>
          setSelectedImageIndex(
            selectedImageIndex > 0 ? selectedImageIndex - 1 : totalImages - 1,
          )
        }
        onNextImage={() =>
          setSelectedImageIndex(
            selectedImageIndex < totalImages - 1 ? selectedImageIndex + 1 : 0,
          )
        }
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
      />

      <div className="flex flex-grow">
        <LeftPanel
          manifestMetadata={manifestMetadata}
          collectionMetadata={collectionMetadata}
        />
        <MiddlePanel
          imageUrl={imageUrl}
          imageType={imageType}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          selectedAnnotation={selectedAnnotation}
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
          pendingAnnotationId={pendingAnnotationId}
          viewerReady={viewerReady}
        />
      </div>
    </div>
  );
};

export default App;
