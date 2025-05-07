// components/MiddlePanel.tsx
import React from 'react';
import IIIFViewer from './IIIFViewer.tsx';

interface MiddlePanelProps {
  imageUrl: string;
  imageType: string;
  canvasWidth?: number;
  canvasHeight?: number;
  imageWidth?: number;
  imageHeight?: number;
  selectedAnnotation: any;
  onViewerReady: () => void;
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
}) => {
  return (
    <div className="w-1/2 flex flex-col">
      <div className="flex-grow">
        <IIIFViewer
          imageUrl={imageUrl}
          imageType={imageType}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          selectedAnnotation={selectedAnnotation}
          onViewerReady={onViewerReady}
        />
      </div>
    </div>
  );
};

export default MiddlePanel;
