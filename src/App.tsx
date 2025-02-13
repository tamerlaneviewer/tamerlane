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
  };

  return (
    <div className='flex flex-col h-screen'>
      <Header onSearch={handleSearch} />
      <div className='flex flex-grow'>
        <SearchResults results={searchResults} onSelectManifest={setSearchResults} />
        <IIIFViewer manifestUrl={selectedManifest} />
        <AnnotationsPanel annotations={annotations} />
      </div>
      <Footer />
    </div>
  );
};

export default App;
