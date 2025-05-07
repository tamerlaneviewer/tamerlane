// components/RightPanel.tsx
import React from 'react';
import AnnotationsPanel from './AnnotationsPanel.tsx';
import { IIIFAnnotation } from '../types/index.ts';

interface RightPanelProps {
  annotations: IIIFAnnotation[];
  searchResults: any[];
  activeTab: 'annotations' | 'searchResults';
  setActiveTab: (tab: 'annotations' | 'searchResults') => void;
  onAnnotationSelect: (anno: IIIFAnnotation) => void;
  onSearchResultClick: (
    canvasTarget: string,
    manifestId?: string,
    searchResultId?: string,
  ) => void;
  selectedAnnotation: IIIFAnnotation | null;
  selectedSearchResultId: string | null;
  autocompleteUrl: string;
  selectedLanguage: string | null;
}

const RightPanel: React.FC<RightPanelProps> = ({
  annotations,
  searchResults,
  activeTab,
  setActiveTab,
  onAnnotationSelect,
  onSearchResultClick,
  selectedAnnotation,
  selectedSearchResultId,
  autocompleteUrl,
  selectedLanguage,
}) => {
  return (
    <div className="w-1/4 border-l flex flex-col overflow-hidden">
      <AnnotationsPanel
        annotations={annotations}
        searchResults={searchResults}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAnnotationSelect={onAnnotationSelect}
        onSearchResultClick={onSearchResultClick}
        selectedAnnotation={selectedAnnotation}
        selectedSearchResultId={selectedSearchResultId}
        autocompleteUrl={autocompleteUrl}
        selectedLanguage={selectedLanguage}
      />
    </div>
  );
};

export default RightPanel;
