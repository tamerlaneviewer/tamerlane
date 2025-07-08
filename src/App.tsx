import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from './components/Header.tsx';
import SplashScreen from './components/SplashScreen.tsx';
import { parseResource } from './service/parser.ts';
import { getCanvasDimensions } from './service/canvas.ts';
import { getAnnotationsForTarget } from './service/annotation.ts';
import { IIIFCollection, IIIFManifest, IIIFAnnotation } from './types/index.ts';
import { searchAnnotations } from './service/search.ts';
import UrlDialog from './components/UrlDialog.tsx';
import ErrorDialog from './components/ErrorDialog.tsx';
import LeftPanel from './components/LeftPanel.tsx';
import MiddlePanel from './components/MiddlePanel.tsx';
import RightPanel from './components/RightPanel.tsx';

const startUrl = process.env.REACT_APP_IIIF_CONTENT_URL;

const App: React.FC = () => {
  const handleAnnotationSelect = (annotation: IIIFAnnotation) => {
    setSelectedAnnotation(annotation);
  };
  const [activePanelTab, setActivePanelTab] = useState<
    'annotations' | 'searchResults'
  >('annotations');
  const [searchParams, setSearchParams] = useSearchParams();
  const iiifContentUrlFromParams = searchParams.get('iiif-content');

  const [iiifContentUrl, setIiifContentUrl] = useState<string | null>(
    startUrl || iiifContentUrlFromParams || null
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

  const handleLanguageChange = (language: string) =>
    setSelectedLanguage(language);

  const [searching, setSearching] = useState(false);

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

  useEffect(() => {
    if (!iiifContentUrl) return;
    parseResource(iiifContentUrl)
      .then(({ firstManifest, manifestUrls, total, collection }) => {
        handleManifestUpdate(firstManifest, manifestUrls, total, collection);
      })
      .catch(() =>
        setError('Failed to load IIIF content. Please check the URL.'),
      );
  }, [iiifContentUrl]);

  const handleViewerReady = useCallback(() => {
    setViewerReady(true);
  }, []);

  const handleSearchResultClick = async (
    canvasTarget: string,
    manifestId?: string,
    searchResultId?: string,
  ) => {
    try {
      if (searchResultId) setSelectedSearchResultId(searchResultId);
      let targetManifest = currentManifest;

      if (manifestId && currentManifest?.id !== manifestId) {
        const matchedIndex = manifestUrls.findIndex((url) =>
          url.includes(manifestId),
        );
        if (matchedIndex === -1) return setError('Manifest not found.');

        const { firstManifest, collection } = await parseResource(
          manifestUrls[matchedIndex],
        );
        if (!firstManifest) return setError('Failed to load manifest.');

        setSelectedManifestIndex(matchedIndex);
        setSelectedImageIndex(0);
        setCurrentManifest(firstManifest);
        handleManifestUpdate(
          firstManifest,
          manifestUrls,
          totalManifests,
          collection,
        );
        targetManifest = firstManifest;
      }

      const baseCanvasTarget = canvasTarget.split('#')[0];
      const newImageIndex = targetManifest?.images.findIndex(
        (img) => img.canvasTarget === baseCanvasTarget,
      );
      if (newImageIndex === -1 || newImageIndex === undefined)
        return setError('Canvas not found.');

      setViewerReady(false);
      setSelectedImageIndex(newImageIndex);
      setCanvasId(canvasTarget);
      setActivePanelTab('annotations');
      if (searchResultId) setPendingAnnotationId(searchResultId);
    } catch (err) {
      console.error('Failed to jump to search result:', err);
      setError('Could not jump to search result.');
    }
  };

  const handleSearch = async (query: string) => {
    if (searching) return;
    const trimmed = query.trim();
    if (!trimmed) return;
    if (!searchUrl)
      return setError('This resource does not support content search.');

    try {
      setSearching(true); 
      const searchEndpoint = `${searchUrl}?q=${encodeURIComponent(trimmed)}`;
      const results = await searchAnnotations(searchEndpoint);
      setSearchResults(results);
      setActivePanelTab('searchResults');
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleManifestUpdate = (
    firstManifest: IIIFManifest | null,
    manifestUrls: string[],
    total: number,
    collection: IIIFCollection | null = null,
  ) => {
    setCurrentManifest(firstManifest);
    setManifestUrls(manifestUrls);
    setTotalManifests(total);

    setManifestMetadata({
      label: firstManifest?.info?.name || '',
      metadata: firstManifest?.info?.metadata || [],
      provider: firstManifest?.info?.provider || [],
      homepage: firstManifest?.info?.homepage || [],
      requiredStatement: firstManifest?.info?.requiredStatement,
    });

    const effectiveCollection = collection ?? currentCollection;

    if (collection) {
      setCurrentCollection(collection);
      setCollectionMetadata({
        label: collection.info.name || '',
        metadata: collection.info.metadata || [],
        provider: collection.info.provider || [],
        homepage: collection.info.homepage || [],
        requiredStatement: collection.info.requiredStatement,
      });
    }

    setAutocompleteUrl(
      effectiveCollection?.collectionSearch?.autocomplete ??
        firstManifest?.manifestSearch?.autocomplete ??
        '',
    );

    setSearchUrl(
      effectiveCollection?.collectionSearch?.service ??
        firstManifest?.manifestSearch?.service ??
        '',
    );
  };

  const fetchManifestByIndex = async (index: number) => {
    if (index < 0 || index >= totalManifests || index === selectedManifestIndex)
      return;
    const manifestUrl = manifestUrls[index];

    try {
      const { firstManifest, collection } = await parseResource(manifestUrl);
      setSelectedAnnotation(null);
      setAnnotations([]);
      setSearchResults([]);
      setSelectedSearchResultId(null);
      setViewerReady(false);
      setSelectedManifestIndex(index);
      setSelectedImageIndex(0);
      handleManifestUpdate(
        firstManifest,
        manifestUrls,
        totalManifests,
        collection,
      );
    } catch (err) {
      console.error('Failed to fetch manifest by index:', err);
      setError('Failed to load selected manifest.');
    }
  };

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
