import React, { useRef, useEffect } from 'react';
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
  pendingAnnotationId?: string | null;
  onPendingAnnotationProcessed?: () => void;
  viewerReady?: boolean;
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
  pendingAnnotationId,
  onPendingAnnotationProcessed,
  viewerReady,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const savedScrollPositions = useRef<{ annotations: number; search: number }>({
    annotations: 0,
    search: 0,
  });

  // Save scroll position when tab changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Save the current scroll position
      if (activeTab === 'annotations') {
        savedScrollPositions.current.annotations = scrollContainerRef.current.scrollTop;
      } else {
        savedScrollPositions.current.search = scrollContainerRef.current.scrollTop;
      }
    }
  }, [activeTab]);

  // Restore scroll position after tab change
  useEffect(() => {
    if (scrollContainerRef.current) {
      const savedPosition = activeTab === 'annotations' 
        ? savedScrollPositions.current.annotations 
        : savedScrollPositions.current.search;
      scrollContainerRef.current.scrollTop = savedPosition;
    }
  }, [activeTab]);

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
      <div 
        ref={scrollContainerRef}
        className="flex-grow overflow-y-auto p-3 max-h-[calc(100vh-100px)]"
      >
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
              pendingAnnotationId={pendingAnnotationId}
              onPendingAnnotationProcessed={onPendingAnnotationProcessed}
              viewerReady={viewerReady}
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
