import React from 'react';
import { BookOpen, Search } from 'lucide-react';
import AnnotationsList from './AnnotationsList.tsx';
import SearchResults from './SearchResults.tsx';
import { IIIFAnnotation, IIIFSearchSnippet } from '../types/index.ts';

interface AnnotationsPanelProps {
  annotations: IIIFAnnotation[];
  searchResults: IIIFSearchSnippet[];
  onAnnotationSelect: (annotation: IIIFAnnotation) => void;
  activeTab: 'annotations' | 'search';
  setActiveTab: (tab: 'annotations' | 'search') => void;
  selectedAnnotation?: IIIFAnnotation;
  selectedSearchResultId?: string;
  onResultClick: (result: IIIFSearchSnippet) => void;
  selectedLanguage?: string;
}

const AnnotationsPanel: React.FC<AnnotationsPanelProps> = ({
  annotations,
  searchResults,
  onAnnotationSelect,
  activeTab,
  setActiveTab,
  onResultClick,
  selectedAnnotation,
  selectedSearchResultId,
  selectedLanguage,
}) => {
  return (
    <div className="flex flex-col h-full max-h-full border shadow-md bg-white">
      {/* Tabs Section (Icons Only) */}
      <div className="flex border-b">
        <button
          className={`flex-1 py-2 flex items-center justify-center transition-all ${
            activeTab === 'annotations'
              ? 'bg-gray-300 text-black'
              : 'bg-gray-200 text-gray-500'
          } hover:bg-gray-400`}
          onClick={() => setActiveTab('annotations')}
          title="Annotations"
        >
          <BookOpen className="w-6 h-6 transition-colors" />
        </button>
        <button
          className={`flex-1 py-2 flex items-center justify-center transition-all ${
            activeTab === 'search'
              ? 'bg-gray-300 text-black'
              : 'bg-gray-200 text-gray-500'
          } hover:bg-gray-400`}
          onClick={() => setActiveTab('search')}
          title="Search Results"
        >
          <Search className="w-6 h-6 transition-colors" />
        </button>
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-grow overflow-y-auto p-3 max-h-[calc(100vh-100px)]">
        {activeTab === 'annotations' ? (
          annotations.length === 0 ? (
            <p className="text-gray-500 text-center">
              No annotations available.
            </p>
          ) : (
            <AnnotationsList
              annotations={annotations}
              onAnnotationSelect={onAnnotationSelect}
              selectedAnnotation={selectedAnnotation}
              selectedLanguage={selectedLanguage || undefined}
            />
          )
        ) : searchResults.length === 0 ? (
          <p className="text-gray-500 text-center">No search results found.</p>
        ) : (
          <SearchResults
            searchResults={searchResults}
            onResultClick={onResultClick}
            selectedSearchResultId={selectedSearchResultId}
            selectedLanguage={selectedLanguage}
          />
        )}
      </div>
    </div>
  );
};

export default AnnotationsPanel;
