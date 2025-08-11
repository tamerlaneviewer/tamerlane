// components/LeftPanel.tsx
import React from 'react';
import MetadataPanel from './MetadataPanel.tsx';

interface LeftPanelProps {
  manifestMetadata: any;
  collectionMetadata: any;
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  manifestMetadata,
  collectionMetadata,
}) => {
  return (
    <div className="hidden md:flex md:w-1/4 border-r flex-col min-h-0 overflow-hidden">
      <MetadataPanel
        manifestMetadata={manifestMetadata}
        collectionMetadata={collectionMetadata}
      />
    </div>
  );
};

export default LeftPanel;
