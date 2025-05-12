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

const App: React.FC = () => {
  const [activePanelTab, setActivePanelTab] = useState<
    'annotations' | 'searchResults'
  >('annotations');
  const [searchParams, setSearchParams] = useSearchParams();
  const iiifContentUrlFromParams = searchParams.get('iiif-content');

  const [iiifContentUrl, setIiifContentUrl] = useState<string | null>(
    iiifContentUrlFromParams,
  );
  const [currentManifest, setCurrentManifest] = useState<IIIFManifest | null>(
    null,
  );
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

  // Handle UI language selection from the dropdown
  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language); // Update the selected language
  };

  // Update canvasId when the current manifest or image index changes
  useEffect(() => {
    if (currentManifest && selectedImageIndex >= 0) {
      const selectedImage = currentManifest.images[selectedImageIndex];
      setCanvasId(selectedImage?.canvasTarget || '');
    }
  }, [currentManifest, selectedImageIndex]);

  // Fetch annotations when manifest, canvas, or index changes
  useEffect(() => {
    if (!currentManifest || !canvasId || manifestUrls.length === 0) return;

    const manifestUrl = manifestUrls[selectedManifestIndex];

    const fetchAnnotations = async () => {
      try {
        const results = await getAnnotationsForTarget(manifestUrl, canvasId);
        setAnnotations(results);
      } catch (err: any) {
        console.error('Error fetching annotations:', err);
        setAnnotations([]);
        setError('Unable to load annotations for this canvas.');
      }
    };

    fetchAnnotations();
  }, [currentManifest, canvasId, selectedManifestIndex, manifestUrls]);

  // Match a pending annotation ID to actual annotation after viewer is ready
  useEffect(() => {
    if (!pendingAnnotationId || annotations.length === 0 || !viewerReady)
      return;

    const match = annotations.find((anno) => anno.id === pendingAnnotationId);

    if (match) {
      setSelectedAnnotation(match);
      console.log('Selected annotation by ID:', match.id);
      setPendingAnnotationId(null); // clear it only after use
      setViewerReady(false); // reset viewer readiness
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '❌ Could not find annotation for ID:',
          pendingAnnotationId,
        );
      }
    }
  }, [annotations, pendingAnnotationId, viewerReady]);

  // Fetch the initial manifest when iiifContentUrl is set
  useEffect(() => {
    if (!iiifContentUrl) return;

    const fetchInitialManifest = async () => {
      try {
        const { firstManifest, manifestUrls, total, collection } =
          await parseResource(iiifContentUrl);
        handleManifestUpdate(
          firstManifest,
          manifestUrls,
          total,
          collection ?? collectionMetadata,
        );
      } catch (err) {
        setError('Failed to load IIIF content. Please check the URL.');
      }
    };

    fetchInitialManifest();
  }, [iiifContentUrl]);

  // Mark the viewer as ready after load
  const handleViewerReady = useCallback(() => {
    setViewerReady(true);
  }, []);

  // Handle search result click by jumping to target canvas and manifest
  const handleSearchResultClick = async (
    canvasTarget: string,
    manifestId?: string,
    searchResultId?: string,
  ) => {
    try {
      if (searchResultId) {
        setSelectedSearchResultId(searchResultId);
      }

      let targetManifest = currentManifest;

      if (manifestId && currentManifest?.id !== manifestId) {
        const matchedIndex = manifestUrls.findIndex((url) =>
          url.includes(manifestId),
        );
        if (matchedIndex === -1) {
          setError('Manifest not found.');
          return;
        }

        const { firstManifest } = await parseResource(
          manifestUrls[matchedIndex],
        );
        if (!firstManifest) {
          setError('Failed to load manifest.');
          return;
        }

        setCurrentManifest(firstManifest);
        setSelectedManifestIndex(matchedIndex);
        targetManifest = firstManifest;
      }

      const baseCanvasTarget = canvasTarget.split('#')[0]; // strip #xywh if present
      const newImageIndex = targetManifest?.images.findIndex(
        (img) => img.canvasTarget === baseCanvasTarget,
      );

      if (newImageIndex === -1 || newImageIndex === undefined) {
        setError('Canvas not found.');
        return;
      }

      setViewerReady(false);
      setSelectedImageIndex(newImageIndex);
      setCanvasId(canvasTarget);
      setActivePanelTab('annotations');

      if (searchResultId) {
        setPendingAnnotationId(searchResultId);
      }
    } catch (err) {
      setError('Could not jump to search result.');
    }
  };

  // Perform search query and set search results
  const handleSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    if (!searchUrl) {
      setError('This resource does not support content search.');
      return;
    }

    try {
      const searchEndpoint = `${searchUrl}?q=${encodeURIComponent(trimmed)}`;
      const results = await searchAnnotations(searchEndpoint);
      setSearchResults(results);
      setActivePanelTab('searchResults');
    } catch (err) {
      setError('Search failed. Please try again.');
    }
  };

  // Update state with new manifest and collection info
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
      requiredStatement: firstManifest?.info?.requiredStatement,
    });

    // Always update collection metadata if collection is passed
    if (collection) {
      setCollectionMetadata({
        label: collection?.info?.name || '',
        metadata: collection?.info?.metadata || [],
        provider: collection?.info?.provider || [],
        requiredStatement: collection?.info?.requiredStatement,
      });
    }

    setAutocompleteUrl(
      collection?.collectionSearch?.autocomplete ??
        firstManifest?.manifestSearch?.autocomplete ??
        '',
    );

    setSearchUrl(
      collection?.collectionSearch?.service ??
        firstManifest?.manifestSearch?.service ??
        '',
    );
  };

  // Fetch a manifest by index and reset related state
  const fetchManifestByIndex = async (index: number) => {
    if (
      index < 0 ||
      index >= totalManifests ||
      index === selectedManifestIndex
    ) {
      return;
    }

    const manifestUrl = manifestUrls[index];

    try {
      const { firstManifest, collection } = await parseResource(manifestUrl);

      // Clean up state when loading a new manifest
      setSelectedAnnotation(null);
      setAnnotations([]);
      setSearchResults([]);
      setSelectedSearchResultId(null);
      setViewerReady(false);

      setSelectedManifestIndex(index);
      setSelectedImageIndex(0);

      // Always pass the new collection (can be null)
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

  // Handle submission of IIIF content URL form
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

  // Reset the image index to 0
  const resetImageIndex = () => setSelectedImageIndex(0);
  // Select an annotation and update state
  const handleAnnotationSelect = (annotation: IIIFAnnotation) =>
    setSelectedAnnotation(annotation);

  if (showUrlDialog) {
    return <UrlDialog onSubmit={handleUrlSubmit} />;
  }

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
        resetImageIndex={resetImageIndex}
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
