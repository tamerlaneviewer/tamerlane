import React, { useState } from 'react';
import Header from './components/Header.tsx';
import Footer from './components/Footer.tsx';
import IIIFViewer from './components/IIIFViewer.tsx';
import AnnotationsPanel from './components/AnnotationsPanel.tsx';
import MetadataPanel from './components/MetadataPanel.tsx';

const App = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [selectedManifest, setSelectedManifest] = useState('');
  const [annotations, setAnnotations] = useState([]);
  const [manifestMetadata] = useState({});
  const [itemMetadata] = useState({});

  const handleSearch = (query: string) => {
    console.log('Searching for:', query);

    // Dummy search results
    const dummyResults = [
      { id: 1, title: 'Dummy Result 1' },
      { id: 2, title: 'Dummy Result 2' },
      { id: 3, title: 'Dummy Result 3' },
    ];

    setSearchResults(dummyResults);
  };

  return (
    <div className='flex flex-col h-screen'>
      <Header onSearch={handleSearch} />
      <div className='flex flex-grow'>
        <MetadataPanel manifestMetadata={manifestMetadata} itemMetadata={itemMetadata} />
        <IIIFViewer manifestUrl={selectedManifest} />
        {/* ✅ Pass searchResults to AnnotationsPanel */}
        <AnnotationsPanel annotations={annotations} searchResults={searchResults} />
      </div>
      <Footer onSelectManifest={setSelectedManifest} />
    </div>
  );
};

export default App;


