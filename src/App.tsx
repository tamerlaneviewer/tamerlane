import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from './components/Header.tsx';
import IIIFViewer from './components/IIIFViewer.tsx';
import AnnotationsPanel from './components/AnnotationsPanel.tsx';
import MetadataPanel from './components/MetadataPanel.tsx';
import SplashScreen from './components/SplashScreen.tsx';
import { parseResource } from './service/parser.ts';
import { getCanvasDimensions } from './service/canvas.ts';
import { getAnnotationsForTarget } from './service/annotation.ts';
import { IIIFManifest, IIIFAnnotation } from './types/index.ts';
import { searchAnnotations } from './service/search.ts';

const App: React.FC = () => {
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
  const [itemMetadata, setItemMetadata] = useState<any>({});
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showUrlDialog, setShowUrlDialog] = useState<boolean>(!iiifContentUrl);
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<IIIFAnnotation | null>(null);

  useEffect(() => {
    if (currentManifest && selectedImageIndex >= 0) {
      const selectedImage = currentManifest.images[selectedImageIndex];
      setCanvasId(selectedImage?.canvasTarget || ''); // Update canvasId
    }
  }, [currentManifest, selectedImageIndex]); // Runs when manifest or image index changes

  useEffect(() => {
    if (!currentManifest || !canvasId || manifestUrls.length === 0) return;

    // Ensure we fetch annotations for the current manifest
    const manifestUrl = manifestUrls[selectedManifestIndex];

    const fetchAnnotations = async () => {
      try {
        const results = await getAnnotationsForTarget(manifestUrl, canvasId);
        setAnnotations(results);
      } catch (error) {
        console.error('Error fetching annotations:', error);
        setAnnotations([]); // Reset if error occurs
      }
    };

    fetchAnnotations();
  }, [currentManifest, canvasId, selectedManifestIndex]); // Add selectedManifestIndex dependency

  /**
   * Fetches the first manifest when a new URL is provided.
   */
  useEffect(() => {
    if (!iiifContentUrl) return;

    const fetchInitialManifest = async () => {
      const { firstManifest, manifestUrls, total } =
        await parseResource(iiifContentUrl);
      handleManifestUpdate(firstManifest, manifestUrls, total);
    };

    fetchInitialManifest();
  }, [iiifContentUrl]);

  /** Handles search functionality */
  const handleSearch = async (query: string) => {
    console.log('📝 Received Search Term:', query);
    if (!currentManifest?.manifestSearch) {
      console.warn('No search service available in this manifest.');
      return;
    }

    const { service, autocomplete } = currentManifest.manifestSearch;
    const searchEndpoint = `${service}?q=${encodeURIComponent(query)}`;
    console.log('🔗 Search Endpoint:', `${searchEndpoint}`);
    const results = await searchAnnotations(searchEndpoint);
    console.log('🔍 Search Results:', results);

  };


  /**
   * Updates manifest-related state.
   */
  const handleManifestUpdate = (
    firstManifest: IIIFManifest | null,
    manifestUrls: string[],
    total: number,
  ) => {
    setCurrentManifest(firstManifest);
    setManifestUrls(manifestUrls);
    setTotalManifests(total);

    // Ensure metadata updates correctly
    setManifestMetadata({
      label: firstManifest?.name || 'Untitled Manifest',
      metadata: firstManifest?.metadata || [],
      provider: firstManifest?.provider || [],
    });
  };

  /**
   * Fetches a specific manifest when navigating between them.
   */
  const fetchManifestByIndex = async (index: number) => {
    if (index < 0 || index >= totalManifests) return;

    const manifestUrl = manifestUrls[index];
    const { firstManifest } = await parseResource(manifestUrl);

    setSelectedManifestIndex(index);
    setSelectedImageIndex(0);

    handleManifestUpdate(firstManifest, manifestUrls, totalManifests);
  };

  /**
   * Handles submission of a new IIIF content URL.
   */
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

  /** Resets the image index when switching manifests. */
  const resetImageIndex = () => setSelectedImageIndex(0);

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
      <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
        <div className="bg-white p-6 rounded shadow-lg">
          <h2 className="text-xl font-bold mb-4">An error occurred</h2>
          <p className="mb-4">{error}</p>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => setError(null)}
          >
            Close
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

  let canvasWidth : number | undefined;
  let canvasHeight : number | undefined;
    
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

  const handlePreviousImage = () => {
    setSelectedImageIndex((prevIndex) =>
      prevIndex > 0 ? prevIndex - 1 : totalImages - 1,
    );
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prevIndex) =>
      prevIndex < totalImages - 1 ? prevIndex + 1 : 0,
    );
  };

  const handlePreviousManifest = () => {
    const newIndex =
      selectedManifestIndex > 0
        ? selectedManifestIndex - 1
        : totalManifests - 1;
    if (!isNaN(newIndex)) {
      fetchManifestByIndex(newIndex);
    }
  };

  const handleNextManifest = () => {
    const newIndex =
      selectedManifestIndex < totalManifests - 1
        ? selectedManifestIndex + 1
        : 0;
    if (!isNaN(newIndex)) {
      fetchManifestByIndex(newIndex);
    }
  };

  // Function to handle annotation selection
  const handleAnnotationSelect = (annotation: IIIFAnnotation) => {
    setSelectedAnnotation(annotation);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header
        onSearch={handleSearch}
        currentIndex={selectedImageIndex}
        totalImages={totalImages}
        totalManifests={totalManifests}
        selectedManifestIndex={selectedManifestIndex}
        onPreviousImage={handlePreviousImage}
        onNextImage={handleNextImage}
        onPreviousManifest={handlePreviousManifest}
        onNextManifest={handleNextManifest}
        resetImageIndex={resetImageIndex}
      />

      <div className="flex flex-grow">
        <div className="w-1/4 border-r flex flex-col">
          <MetadataPanel
            manifestMetadata={manifestMetadata}
            itemMetadata={itemMetadata}
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
            />
          </div>
        </div>

        <div className="w-1/4 border-l flex flex-col overflow-hidden">
          <AnnotationsPanel
            annotations={annotations}
            searchResults={searchResults}
            onAnnotationSelect={handleAnnotationSelect}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
