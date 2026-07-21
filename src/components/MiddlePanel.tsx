// components/MiddlePanel.tsx
import React from 'react';
import IIIFViewer from './IIIFViewer.tsx';
import ChoiceControls, { ChoiceGroup } from './ChoiceControls.tsx';
import { IIIFImage } from '../types/index.ts';

interface MiddlePanelProps {
  images: IIIFImage[];
  canvasWidth?: number;
  canvasHeight?: number;
  choiceGroups: ChoiceGroup[];
  onChoiceSelect: (choiceId: string, index: number) => void;
  selectedAnnotation: any;
  regionTarget?: string | null;
  onViewerReady: () => void;
  onImageLoadError: (message: string) => void;
}

const MiddlePanel: React.FC<MiddlePanelProps> = ({
  images,
  canvasWidth,
  canvasHeight,
  choiceGroups,
  onChoiceSelect,
  selectedAnnotation,
  regionTarget,
  onViewerReady,
  onImageLoadError,
}) => {
  return (
    <div className="flex-grow relative min-h-0 overflow-hidden">
      <IIIFViewer
        images={images}
        canvasWidth={canvasWidth || 1000}
        canvasHeight={canvasHeight || 1000}
        selectedAnnotation={selectedAnnotation}
        regionTarget={regionTarget}
        onViewerReady={onViewerReady}
        onImageLoadError={onImageLoadError}
      />
      <ChoiceControls groups={choiceGroups} onSelect={onChoiceSelect} />
    </div>
  );
};

export default MiddlePanel;
