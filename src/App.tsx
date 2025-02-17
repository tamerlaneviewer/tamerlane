import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom'; // ✅ Get URL params
import Header from './components/Header.tsx';
import Footer from './components/Footer.tsx';
import IIIFViewer from './components/IIIFViewer.tsx';
import AnnotationsPanel from './components/AnnotationsPanel.tsx';
import MetadataPanel from './components/MetadataPanel.tsx';
import { constructManifests } from './service/maniiifestService.ts';

const App = () => {
  // ✅ Get `iiif-content` URL parameter
  const [searchParams] = useSearchParams();
  const iiifContentUrl = searchParams.get('iiif-content');

  // ✅ Store manifests in state
  const [manifests, setManifests] = useState<any[]>([]);
  const [selectedManifestIndex, setSelectedManifestIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [annotations, setAnnotations] = useState([]);
  const [manifestMetadata, setManifestMetadata] = useState({});
  const [itemMetadata, setItemMetadata] = useState({});
  const [searchResults, setSearchResults] = useState([]);

  // ✅ Fetch manifests from the provided URL
  useEffect(() => {
    if (!iiifContentUrl) return; // Do nothing if the URL param is missing

    async function fetchManifests() {
      try {
        const fetchedManifests = await constructManifests(iiifContentUrl as string);
        setManifests(fetchedManifests);
      } catch (error) {
        console.error("Error fetching manifests:", error);
      }
    }

    fetchManifests();
  }, [iiifContentUrl]); // ✅ Fetch when `iiif-content` param changes

  // ✅ Prevent rendering if manifests are not yet loaded
  if (manifests.length === 0) {
    return <div>Loading manifests...</div>;
  }

  const currentManifest = manifests[selectedManifestIndex];
  const totalManifests = manifests.length;
  const totalImages = currentManifest.images.length;

  // ✅ Image Navigation
  const handlePreviousImage = () => {
    setSelectedImageIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : totalImages - 1));
  };
  const handleNextImage = () => {
    setSelectedImageIndex((prevIndex) => (prevIndex < totalImages - 1 ? prevIndex + 1 : 0));
  };

  // ✅ Manifest Navigation
  const handlePreviousManifest = () => {
    setSelectedManifestIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : totalManifests - 1));
    setSelectedImageIndex(0); // Reset image index on manifest change
  };
  const handleNextManifest = () => {
    setSelectedManifestIndex((prevIndex) => (prevIndex < totalManifests - 1 ? prevIndex + 1 : 0));
    setSelectedImageIndex(0); // Reset image index on manifest change
  };

  return (
    <div className="flex flex-col h-screen">
      <Header onSearch={() => {}} />

      <div className="flex flex-grow">
        {/* Left Column: Metadata Panel */}
        <div className="w-1/4 border-r flex flex-col">
          <MetadataPanel manifestMetadata={manifestMetadata} itemMetadata={itemMetadata} />
        </div>

        {/* Middle Column: IIIF Viewer */}
        <div className="w-1/2 flex flex-col">
          <div className="flex-grow">
            <IIIFViewer imageUrl={currentManifest.images[selectedImageIndex]} />
          </div>
        </div>

        {/* Right Column: Annotations Panel */}
        <div className="w-1/4 border-l flex flex-col overflow-hidden">
          <AnnotationsPanel annotations={annotations} searchResults={searchResults} />
        </div>
      </div>

      {/* ✅ Footer Now Contains IIIF Navigation Controls */}
      <Footer 
        currentIndex={selectedImageIndex} 
        totalImages={totalImages} 
        totalManifests={totalManifests} 
        onPreviousImage={handlePreviousImage} 
        onNextImage={handleNextImage} 
        onPreviousManifest={handlePreviousManifest} 
        onNextManifest={handleNextManifest} 
      />
    </div>
  );
};

export default App;
