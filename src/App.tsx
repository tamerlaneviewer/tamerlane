import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "./components/Header.tsx";
import IIIFViewer from "./components/IIIFViewer.tsx";
import AnnotationsPanel from "./components/AnnotationsPanel.tsx";
import MetadataPanel from "./components/MetadataPanel.tsx";
import SplashScreen from "./components/SplashScreen.tsx";
import { constructManifests, getCanvasDimensions } from "./service/parser.ts";

const App: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const iiifContentUrlFromParams = searchParams.get("iiif-content");

  const [iiifContentUrl, setIiifContentUrl] = useState<string | null>(
    iiifContentUrlFromParams
  );
  const [currentManifest, setCurrentManifest] = useState<any | null>(null);
  const [manifestUrls, setManifestUrls] = useState<string[]>([]);
  const [totalManifests, setTotalManifests] = useState<number>(0);
  const [selectedManifestIndex, setSelectedManifestIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [annotations, setAnnotations] = useState([]);
  const [manifestMetadata, setManifestMetadata] = useState({});
  const [itemMetadata, setItemMetadata] = useState({});
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState<string | null>(null);
  const [showUrlDialog, setShowUrlDialog] = useState(!iiifContentUrl);

  useEffect(() => {
    if (!iiifContentUrl) return;

    async function fetchInitialManifest() {
      try {
        const { firstManifest, manifestUrls, total } = await constructManifests(
          iiifContentUrl
        );
        setCurrentManifest(firstManifest);
        setManifestUrls(manifestUrls);
        setTotalManifests(total);
      } catch (error: any) {
        console.error("Error fetching manifests:", error);
        setError(error.message);
      }
    }

    fetchInitialManifest();
  }, [iiifContentUrl]);

  const handleUrlSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const url = formData.get("iiifContentUrl") as string;
    if (url !== iiifContentUrl) {
      setIiifContentUrl(url);
      setSearchParams({ "iiif-content": url });
      setShowUrlDialog(false);
    }
  };

  const resetImageIndex = () => {
    setSelectedImageIndex(0);
  };

  const fetchManifestByIndex = async (index: number) => {
    if (index < 0 || index >= totalManifests) return;

    try {
      const manifestUrl = manifestUrls[index];
      const { firstManifest } = await constructManifests(manifestUrl);
      setCurrentManifest(firstManifest);
      setSelectedManifestIndex(index);
      resetImageIndex();
    } catch (error) {
      console.error("Error fetching new manifest:", error);
      setError(error.message);
    }
  };

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

  if (!currentManifest) {
    return <SplashScreen />;
  }

  const totalImages = currentManifest?.images.length ?? 0;

  if (totalImages === 0) {
    return (
      <div className="text-center mt-10 text-gray-500">
        No images available in this manifest.
      </div>
    );
  }

  const selectedImage = currentManifest.images[selectedImageIndex];
  const canvasId = selectedImage?.canvasTarget;

  let canvasWidth = 1000;
  let canvasHeight = 1000;

  try {
    if (canvasId) {
      const dimensions = getCanvasDimensions(currentManifest, canvasId);
      canvasWidth = dimensions.canvasWidth;
      canvasHeight = dimensions.canvasHeight;
    }
  } catch (error) {
    console.warn("Error retrieving canvas dimensions:", error);
  }

  const imageUrl = selectedImage?.imageUrl || "";
  const imageType = selectedImage?.imageType || "standard";
  const imageWidth = selectedImage?.imageWidth || canvasWidth;
  const imageHeight = selectedImage?.imageHeight || canvasHeight;

  const handlePreviousImage = () => {
    setSelectedImageIndex((prevIndex) =>
      prevIndex > 0 ? prevIndex - 1 : totalImages - 1
    );
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prevIndex) =>
      prevIndex < totalImages - 1 ? prevIndex + 1 : 0
    );
  };

  const handlePreviousManifest = () => {
    fetchManifestByIndex(selectedManifestIndex - 1);
  };

  const handleNextManifest = () => {
    fetchManifestByIndex(selectedManifestIndex + 1);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header
        onSearch={() => {}}
        currentIndex={selectedImageIndex}
        totalImages={totalImages}
        totalManifests={totalManifests}
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
            />
          </div>
        </div>

        <div className="w-1/4 border-l flex flex-col overflow-hidden">
          <AnnotationsPanel
            annotations={annotations}
            searchResults={searchResults}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
