import React, { useState } from 'react';
import ItemMetadata from './ItemMetadata.tsx';
import ManifestMetadata from './ManifestMetadata.tsx';

const MetadataPanel = ({ manifestMetadata, itemMetadata }) => {
  const [activeTab, setActiveTab] = useState('manifest');

  return (
    <div className='flex flex-col h-full'>
      <div className='flex'>
        <button
          className={`p-2 ${activeTab === 'manifest' ? 'bg-gray-300' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('manifest')}
        >
          Manifest Metadata
        </button>
        <button
          className={`p-2 ${activeTab === 'item' ? 'bg-gray-300' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('item')}
        >
          Item Metadata
        </button>
      </div>
      <div className='flex-grow overflow-auto p-4'>
        {activeTab === 'manifest' && <ManifestMetadata manifestMetadata={manifestMetadata} />}
        {activeTab === 'item' && <ItemMetadata itemMetadata={itemMetadata} />}
      </div>
    </div>
  );
};

export default MetadataPanel;