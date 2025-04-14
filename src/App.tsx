import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from './components/Header.tsx';
import IIIFViewer from './components/IIIFViewer.tsx';
import AnnotationsPanel from './components/AnnotationsPanel.tsx';
import MetadataPanel from './components/MetadataPanel.tsx';
import SplashScreen from './components/SplashScreen.tsx';
import { parseResource } from './service/parser.ts';
import { getCanvasDimensions } from './service/canvas.ts';
import { getAnnotationsForTarget } from './service/annotation.ts';
import { IIIFCollection, IIIFManifest, IIIFAnnotation } from './types/index.ts';
import { searchAnnotations } from './service/search.ts';

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
    
  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language); // Update the selected language
  };

  useEffect(() => {
    if (currentManifest && selectedImageIndex >= 0) {
      const selectedImage = currentManifest.images[selectedImageIndex];
      setCanvasId(selectedImage?.canvasTarget || '');
    }
  }, [currentManifest, selectedImageIndex]);

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

  const handleViewerReady = useCallback(() => {
    setViewerReady(true);
  }, []);

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

  const handleManifestUpdate = (
    firstManifest: IIIFManifest | null,
    manifestUrls: string[],
    total: number,
    collection: IIIFCollection | null = null,
    collectionSearch?: { service: string; autocomplete?: string },
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
      collectionSearch?.autocomplete ??
        firstManifest?.manifestSearch?.autocomplete ??
        '',
    );

    setSearchUrl(
      collectionSearch?.service ?? firstManifest?.manifestSearch?.service ?? '',
    );
  };

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

  const resetImageIndex = () => setSelectedImageIndex(0);
  const handleAnnotationSelect = (annotation: IIIFAnnotation) =>
    setSelectedAnnotation(annotation);

  if (showUrlDialog) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
        <div className="bg-white p-6 rounded shadow-lg">
          <h2 className="text-xl font-bold mb-4">Enter IIIF Content URL</h2>
          <form onSubmit={handleUrlSubmit}>
            <input
              type="text"
              name="iiifContentUrl"
              placeholder="Enter IIIF Content URL"
              className="border p-2 mb-4 w-full"
              required
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 text-center">
          {/* Title */}
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Something went wrong
          </h2>

          {/* Error Message */}
          <p className="text-sm text-gray-600 mb-5">{error}</p>

          {/* Dismiss Button */}
          <button
            onClick={() => {
              setError(null);
              if (!currentManifest) {
                // Only reset to URL input if initial loading failed
                setIiifContentUrl(null);
                setCurrentManifest(null);
                setShowUrlDialog(true);
              }
            }}
            className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          >
            Dismiss
          </button>
        </div>
      </div>
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
      />

      <div className="flex flex-grow">
        <div className="w-1/4 border-r flex flex-col">
          <MetadataPanel
            manifestMetadata={manifestMetadata}
            collectionMetadata={collectionMetadata}
          />
        </div>

        <div className="w-1/2 flex flex-col">
          <div className="flex-grow">
            <IIIFViewer
              imageUrl={imageUrl}
              imageType={imageType}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              selectedAnnotation={selectedAnnotation}
              onViewerReady={handleViewerReady}
            />
          </div>
        </div>

        <div className="w-1/4 border-l flex flex-col overflow-hidden">
          <AnnotationsPanel
            annotations={annotations} // pass language-filtered annotations
            searchResults={searchResults}
            onAnnotationSelect={handleAnnotationSelect}
            activeTab={activePanelTab}
            setActiveTab={setActivePanelTab}
            onSearchResultClick={handleSearchResultClick}
            selectedAnnotation={selectedAnnotation}
            selectedSearchResultId={selectedSearchResultId}
            autocompleteUrl={autocompleteUrl}
            selectedLanguage={selectedLanguage} // pass selected language
          />
        </div>
      </div>
    </div>
  );
};

export default App;
