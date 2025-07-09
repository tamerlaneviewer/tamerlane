import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from './components/Header.tsx';
import SplashScreen from './components/SplashScreen.tsx';
import UrlDialog from './components/UrlDialog.tsx';
import ErrorDialog from './components/ErrorDialog.tsx';
import LeftPanel from './components/LeftPanel.tsx';
import MiddlePanel from './components/MiddlePanel.tsx';
import RightPanel from './components/RightPanel.tsx';
import { getCanvasDimensions } from './service/canvas.ts';
import { getAnnotationsForTarget } from './service/annotation.ts';
import { IIIFCollection, IIIFManifest, IIIFAnnotation } from './types/index.ts';
import { useIIIFLoader } from './hooks/useIIIFLoader.ts';
import { useSearchLogic } from './hooks/useSearchLogic.ts';
import { useManifestController } from './lib/manifestController.ts';
import { useManifestNavigator } from './hooks/useManifestNavigator.ts';

const startUrl = process.env.REACT_APP_IIIF_CONTENT_URL;

const App: React.FC = () => {
  const [activePanelTab, setActivePanelTab] = useState<
    'annotations' | 'searchResults'
  >('annotations');
  const [searchParams, setSearchParams] = useSearchParams();
  const iiifContentUrlFromParams = searchParams.get('iiif-content');
  const [iiifContentUrl, setIiifContentUrl] = useState<string | null>(
    startUrl || iiifContentUrlFromParams || null,
  );

  const [currentManifest, setCurrentManifest] = useState<IIIFManifest | null>(
    null,
  );
  const [currentCollection, setCurrentCollection] =
    useState<IIIFCollection | null>(null);
  const [canvasId, setCanvasId] = useState<string>('');
  const [manifestUrls, setManifestUrls] = useState<string[]>([]);
  const [totalManifests, setTotalManifests] = useState<number>(0);
  const [selectedManifestIndex, setSelectedManifestIndex] = useState<number>(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  const [annotations, setAnnotations] = useState<IIIFAnnotation[]>([]);
  const [manifestMetadata, setManifestMetadata] = useState<any>({});
  const [collectionMetadata, setCollectionMetadata] = useState<any>({});
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showUrlDialog, setShowUrlDialog] = useState<boolean>(!iiifContentUrl);
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<IIIFAnnotation | null>(null);
  const [pendingAnnotationId, setPendingAnnotationId] = useState<string | null>(
    null,
  );
  const [selectedSearchResultId, setSelectedSearchResultId] = useState<
    string | null
  >(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [autocompleteUrl, setAutocompleteUrl] = useState<string>('');
  const [searchUrl, setSearchUrl] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>('en');
  const [searching, setSearching] = useState(false);

  const handleAnnotationSelect = (annotation: IIIFAnnotation) =>
    setSelectedAnnotation(annotation);
  const handleLanguageChange = (language: string) =>
    setSelectedLanguage(language);
  const handleViewerReady = useCallback(() => setViewerReady(true), []);

  const { handleManifestUpdate } = useManifestController({
    setCurrentManifest,
    setManifestUrls,
    setTotalManifests,
    setCurrentCollection,
    setManifestMetadata,
    setCollectionMetadata,
    setAutocompleteUrl,
    setSearchUrl,
    currentCollection,
  });

  const { fetchManifestByIndex } = useManifestNavigator({
    manifestUrls,
    totalManifests,
    selectedManifestIndex,
    setSelectedManifestIndex,
    setSelectedImageIndex,
    setSelectedAnnotation,
    setAnnotations,
    setSearchResults,
    setSelectedSearchResultId,
    setViewerReady,
    setError,
    handleManifestUpdate,
  });

  useIIIFLoader(iiifContentUrl, handleManifestUpdate, setError);

  const { handleSearch, handleSearchResultClick } = useSearchLogic({
    currentManifest,
    manifestUrls,
    totalManifests,
    setSelectedManifestIndex,
    setSelectedImageIndex,
    setCurrentManifest,
    setCanvasId,
    setViewerReady,
    setPendingAnnotationId,
    setActivePanelTab,
    setSelectedSearchResultId,
    setError,
    setSearchResults,
    setSearching,
    searchUrl,
    handleManifestUpdate,
    selectedManifestIndex,
  });

  useEffect(() => {
    if (currentManifest && selectedImageIndex >= 0) {
      const selectedImage = currentManifest.images[selectedImageIndex];
      setCanvasId(selectedImage?.canvasTarget || '');
    }
  }, [currentManifest, selectedImageIndex]);

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
  }, [currentManifest, canvasId, selectedManifestIndex, manifestUrls]);

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
  }, [annotations, pendingAnnotationId, viewerReady]);

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

  if (showUrlDialog) return <UrlDialog onSubmit={handleUrlSubmit} />;
  if (error) {
    return (
      <ErrorDialog
        message={error}
        onDismiss={() => {
          setError(null);
          if (!currentManifest) {
            setIiifContentUrl(null);
            setCurrentManifest(null);
            setShowUrlDialog(true);
          }
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
        onSearch={handleSearch}
        autocompleteUrl={autocompleteUrl}
        searching={searching}
        currentIndex={selectedImageIndex}
        totalImages={totalImages}
        totalManifests={totalManifests}
        selectedManifestIndex={selectedManifestIndex}
        onPreviousImage={() =>
          setSelectedImageIndex((i) => (i > 0 ? i - 1 : totalImages - 1))
        }
        onNextImage={() =>
          setSelectedImageIndex((i) => (i < totalImages - 1 ? i + 1 : 0))
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
