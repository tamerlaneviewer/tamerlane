import React, { useState } from 'react';
import Header from './components/Header.tsx';
import Footer from './components/Footer.tsx';
import IIIFViewer from './components/IIIFViewer.tsx';
import AnnotationsPanel from './components/AnnotationsPanel.tsx';
import MetadataPanel from './components/MetadataPanel.tsx';
import { constructManifests } from './service/maniiifestService.ts';

  const manifests = await constructManifests('https://gist.githubusercontent.com/jptmoore/b67cb149bbd11590022db9178cd23843/raw/60828ef3fb7b4cf2dc8ed9ecdd41869296bdf596/copy1.json')

const App = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [selectedManifestIndex, setSelectedManifestIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [annotations, setAnnotations] = useState([]);
  const [manifestMetadata, setManifestMetadata] = useState({});
  const [itemMetadata, setItemMetadata] = useState({});


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
