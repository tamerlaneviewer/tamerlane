import React, { useState } from "react";
import { FileText, Layers } from "lucide-react";
import CollectionMetadata from "./CollectionMetadata.tsx";
import ManifestMetadata from "./ManifestMetadata.tsx";

const MetadataPanel = ({ manifestMetadata, collectionMetadata }) => {
  const [activeTab, setActiveTab] = useState<"manifest" | "item">("manifest");

  return (
    <div className="flex flex-col h-full max-h-full border shadow-md bg-white">
      {/* Tabs Section */}
      <div className="flex border-b">
        <button
          className={`flex-1 py-2 text-center flex items-center justify-center gap-2 transition-all ${
            activeTab === "manifest" ? "bg-gray-300 font-bold text-black" : "bg-gray-200 text-gray-500"
          } hover:bg-gray-400`}
          onClick={() => setActiveTab("manifest")}
          title="Manifest"
        >
          <FileText className="w-6 h-6 transition-colors" />
        </button>
        <button
          className={`flex-1 py-2 text-center flex items-center justify-center gap-2 transition-all ${
            activeTab === "item" ? "bg-gray-300 font-bold text-black" : "bg-gray-200 text-gray-500"
          } hover:bg-gray-400`}
          onClick={() => setActiveTab("item")}
          title="Collection"
        >
          <Layers className="w-6 h-6 transition-colors" />
        </button>
      </div>

      {/* Scrollable Content Section */}
  <div className="flex-grow min-h-0 overflow-auto p-3 overscroll-contain">
        {activeTab === "manifest" ? (
          <ManifestMetadata manifestMetadata={manifestMetadata} />
        ) : (
          <CollectionMetadata collectionMetadata={collectionMetadata} />
        )}
      </div>
    </div>
  );
};

export default MetadataPanel;
