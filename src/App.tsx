import React, { useState } from 'react';
import Header from './components/Header.tsx';
import Footer from './components/Footer.tsx';
import SearchResults from './components/SearchResults.tsx';
import IIIFViewer from './components/IIIFViewer.tsx';
import AnnotationsPanel from './components/AnnotationsPanel.tsx';

const App = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [selectedManifest, setSelectedManifest] = useState('');
  const [annotations] = useState([]);

  const handleSearch = (query: string) => {
    // Implement search logic here
    console.log('Searching for:', query);

    // Set dummy search results
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
        <SearchResults results={searchResults} />
        <IIIFViewer manifestUrl={selectedManifest} />
        <AnnotationsPanel annotations={annotations} />
      </div>
      <Footer onSelectManifest={setSelectedManifest} />
    </div>
  );
};

export default App;
