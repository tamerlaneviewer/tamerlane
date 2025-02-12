import React, { useState } from 'react';
import SearchBar from './components/SearchBar.tsx';
import SearchResults from './components/SearchResults.tsx';
import IIIFViewer from './components/IIIFViewer.tsx';
import AnnotationsPanel from './components/AnnotationsPanel.tsx';
import Workspace from './components/Workspace.tsx';

const App = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [selectedManifest, setSelectedManifest] = useState('');
  const [annotations, setAnnotations] = useState([]);
  return (<div className='flex h-screen'><SearchResults results={searchResults} onSelectManifest={setSelectedManifest} /><IIIFViewer manifestUrl={selectedManifest} /><AnnotationsPanel annotations={annotations} /><Workspace /></div>);
};

export default App;
