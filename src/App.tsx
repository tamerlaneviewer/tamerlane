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
  const error = useIIIFStore((state) => state.error);
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
  const setSelectedImageIndex = useIIIFStore(
    (state) => state.setSelectedImageIndex,
  );
  const setAnnotations = useIIIFStore((state) => state.setAnnotations);
  const setError = useIIIFStore((state) => state.setError);
  const setShowUrlDialog = useIIIFStore((state) => state.setShowUrlDialog);
  const setSelectedAnnotation = useIIIFStore(
    (state) => state.setSelectedAnnotation,
  );
  const setPendingAnnotationId = useIIIFStore(
    (state) => state.setPendingAnnotationId,
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
        .catch(() =>
          setError('Failed to load IIIF content. Please check the URL.'),
        );
    }
  }, [iiifContentUrl, manifestUrls.length, handleManifestUpdate, setError]);

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

  useEffect(() => {
    if (currentManifest && selectedImageIndex >= 0) {
      const selectedImage = currentManifest.images[selectedImageIndex];
      setCanvasId(selectedImage?.canvasTarget || '');
    }
  }, [currentManifest, selectedImageIndex, setCanvasId]);

  useEffect(() => {
    if (!currentManifest || !canvasId || manifestUrls.length === 0) return;
    const manifestUrl = manifestUrls[selectedManifestIndex];
    getAnnotationsForTarget(manifestUrl, canvasId)
      .then(setAnnotations)
      .catch((err) => {
        console.error('Error fetching annotations:', err);
        setAnnotations([]);
        setError('Unable to load annotations for this canvas.');
      });
  }, [
    currentManifest,
    canvasId,
    selectedManifestIndex,
    manifestUrls,
    setAnnotations,
    setError,
  ]);

  useEffect(() => {
    if (!pendingAnnotationId || annotations.length === 0 || !viewerReady)
      return;
    const match = annotations.find((anno) => anno.id === pendingAnnotationId);
    if (match) {
      setSelectedAnnotation(match);
      setPendingAnnotationId(null);
      setViewerReady(false);
    } else {
      console.warn('❌ Could not find annotation for ID:', pendingAnnotationId);
    }
  }, [
    annotations,
    pendingAnnotationId,
    viewerReady,
    setSelectedAnnotation,
    setPendingAnnotationId,
    setViewerReady,
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

  const handleAnnotationSelect = useCallback(
    (annotation: IIIFAnnotation) => {
      setSelectedAnnotation(annotation);
    },
    [setSelectedAnnotation],
  );

  const handleLanguageChange = useCallback(
    (language: string) => setSelectedLanguage(language),
    [setSelectedLanguage],
  );

  const handleViewerReady = useCallback(() => {
    setViewerReady(true);
  }, [setViewerReady]);

  const handleImageLoadError = useCallback(
    (message: string) => {
      setError(message);
    },
    [setError],
  );

  // Use the store's handleSearch, which uses searchUrl internally
  const onSearch = (query: string) => handleSearch(query);

  if (showUrlDialog) return <UrlDialog onSubmit={handleUrlSubmit} />;
  if (error) {
    return (
      <ErrorDialog
        message={error}
        onDismiss={() => {
          setError(null);
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
          onSearchResultClick={handleSearchResultClick}
          selectedAnnotation={selectedAnnotation}
          selectedSearchResultId={selectedSearchResultId}
          autocompleteUrl={autocompleteUrl}
          selectedLanguage={selectedLanguage}
        />
      </div>
    </div>
  );
};

export default App;
