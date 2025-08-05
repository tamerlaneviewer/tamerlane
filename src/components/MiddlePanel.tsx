// components/MiddlePanel.tsx
import React from 'react';
import IIIFViewer from './IIIFViewer.tsx';

interface MiddlePanelProps {
  imageUrl: string;
  imageType: 'standard' | 'iiif';
  canvasWidth?: number;
  canvasHeight?: number;
  imageWidth?: number;
  imageHeight?: number;
  selectedAnnotation: any;
  onViewerReady: () => void;
  onImageLoadError: (message: string) => void;
}

const MiddlePanel: React.FC<MiddlePanelProps> = ({
  imageUrl,
  imageType,
  canvasWidth,
  canvasHeight,
  imageWidth,
  imageHeight,
  selectedAnnotation,
  onViewerReady,
  onImageLoadError,
}) => {
  return (
    <div className="flex-grow relative">
      <IIIFViewer
        imageUrl={imageUrl}
        imageType={imageType}
        canvasWidth={canvasWidth || 1000}
        canvasHeight={canvasHeight || 1000}
        imageWidth={imageWidth || canvasWidth || 1000}
        imageHeight={imageHeight || canvasHeight || 1000}
        selectedAnnotation={selectedAnnotation}
        onViewerReady={onViewerReady}
        onImageLoadError={onImageLoadError}
      />
    </div>
  );
};

export default MiddlePanel;
