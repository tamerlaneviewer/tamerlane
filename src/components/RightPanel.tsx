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
  pendingAnnotationId?: string | null;
  onPendingAnnotationProcessed?: () => void;
  viewerReady?: boolean;
  annotationsLoading?: boolean;
  searching?: boolean;
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
  pendingAnnotationId,
  onPendingAnnotationProcessed,
  viewerReady,
  annotationsLoading,
  searching,
}) => {
  return (
    <div className="hidden md:flex md:w-1/4 border-l flex-col min-h-0 overflow-hidden">
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
        pendingAnnotationId={pendingAnnotationId}
        onPendingAnnotationProcessed={onPendingAnnotationProcessed}
        viewerReady={viewerReady}
        annotationsLoading={annotationsLoading}
        searching={searching}
      />
    </div>
  );
};

export default RightPanel;
