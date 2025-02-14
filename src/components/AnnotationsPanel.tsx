import React, { useState } from 'react';
import AnnotationsList from './AnnotationsList.tsx';
import SearchResults from './SearchResults.tsx';

const AnnotationsPanel = ({ annotations = [], searchResults = [] }) => {
  const [activeTab, setActiveTab] = useState('annotations');

  return (
    <div className="flex flex-col h-full border shadow-md bg-white w-1/4">
      {/* Tabs */}
      <div className="flex border-b bg-gray-100">
        <button
          className={`w-1/2 px-4 py-2 text-sm font-medium transition duration-200 flex justify-center items-center ${
            activeTab === 'annotations'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
          onClick={() => setActiveTab('annotations')}
        >
          Annotations
        </button>
        <button
          className={`w-1/2 px-4 py-2 text-sm font-medium transition duration-200 flex justify-center items-center ${
            activeTab === 'search'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
          onClick={() => setActiveTab('search')}
        >
          Search Results
        </button>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-auto p-4">
        {activeTab === 'annotations' && <AnnotationsList annotations={annotations} />}
        {activeTab === 'search' && <SearchResults searchResults={searchResults} />}
      </div>
    </div>
  );
};

export default AnnotationsPanel;
