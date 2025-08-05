// components/RightPanel.tsx
import React from 'react';
import AnnotationsPanel from './AnnotationsPanel.tsx';
import { IIIFAnnotation, IIIFSearchSnippet } from '../types/index.ts';

interface RightPanelProps {
  annotations: IIIFAnnotation[];
  searchResults: IIIFSearchSnippet[];
  activeTab: 'annotations' | 'search';
  setActiveTab: (tab: 'annotations' | 'search') => void;
  onAnnotationSelect: (anno: IIIFAnnotation) => void;
  onResultClick: (result: IIIFSearchSnippet) => void;
  selectedAnnotation?: IIIFAnnotation;
  selectedSearchResultId?: string;
  selectedLanguage?: string;
}

const RightPanel: React.FC<RightPanelProps> = ({
  annotations,
  searchResults,
  activeTab,
  setActiveTab,
  onAnnotationSelect,
  onResultClick,
  selectedAnnotation,
  selectedSearchResultId,
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
        onResultClick={onResultClick}
        selectedAnnotation={selectedAnnotation}
        selectedSearchResultId={selectedSearchResultId}
        selectedLanguage={selectedLanguage}
      />
    </div>
  );
};

export default RightPanel;
