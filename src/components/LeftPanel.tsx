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
    <div className="w-1/4 border-r flex flex-col">
      <MetadataPanel
        manifestMetadata={manifestMetadata}
        collectionMetadata={collectionMetadata}
      />
    </div>
  );
};

export default LeftPanel;
