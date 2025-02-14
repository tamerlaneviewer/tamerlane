import React, { useState } from 'react';
import ItemMetadata from './ItemMetadata.tsx';
import ManifestMetadata from './ManifestMetadata.tsx';

const MetadataPanel = ({ manifestMetadata, itemMetadata }) => {
  const [activeTab, setActiveTab] = useState('manifest');

  return (
    <div className="flex flex-col h-full border shadow-md bg-white">
      {/* ✅ Tabs - Matches AnnotationsPanel */}
      <div className="flex border-b">
        <button
          className={`flex-1 py-2 text-center ${
            activeTab === "manifest" ? "bg-gray-300 font-bold" : "bg-gray-200"
          }`}
          onClick={() => setActiveTab("manifest")}
        >
          Manifest
        </button>
        <button
          className={`flex-1 py-2 text-center ${
            activeTab === "item" ? "bg-gray-300 font-bold" : "bg-gray-200"
          }`}
          onClick={() => setActiveTab("item")}
        >
          Item
        </button>
      </div>

      {/* ✅ Content - Toggle Between Manifest and Item Metadata */}
      <div className="flex-grow overflow-auto p-3">
        {activeTab === 'manifest' ? (
          <ManifestMetadata manifestMetadata={manifestMetadata} />
        ) : (
          <ItemMetadata itemMetadata={itemMetadata} />
        )}
      </div>
    </div>
  );
};

export default MetadataPanel;
