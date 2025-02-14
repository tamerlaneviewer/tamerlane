import React, { useState } from 'react';
import ItemMetadata from './ItemMetadata.tsx';
import ManifestMetadata from './ManifestMetadata.tsx';

const MetadataPanel = ({ manifestMetadata, itemMetadata }) => {
  const [activeTab, setActiveTab] = useState('manifest');

  return (
    <div className="flex flex-col h-full border shadow-md bg-white">
      {/* Tabs */}
      <div className="flex border-b bg-gray-100">
        <button
          className={`w-1/2 px-4 py-2 text-sm font-medium transition duration-200 flex justify-center items-center ${
            activeTab === 'manifest'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
          onClick={() => setActiveTab('manifest')}
        >
          Manifest
        </button>
        <button
          className={`w-1/2 px-4 py-2 text-sm font-medium transition duration-200 flex justify-center items-center ${
            activeTab === 'item'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
          onClick={() => setActiveTab('item')}
        >
          Item
        </button>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-auto p-4">
        {activeTab === 'manifest' && <ManifestMetadata manifestMetadata={manifestMetadata} />}
        {activeTab === 'item' && <ItemMetadata itemMetadata={itemMetadata} />}
      </div>
    </div>
  );
};

export default MetadataPanel;
