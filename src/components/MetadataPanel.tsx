import React, { useState } from "react";
import { FileText, Image } from "lucide-react";
import ItemMetadata from "./ItemMetadata.tsx";
import ManifestMetadata from "./ManifestMetadata.tsx";

const MetadataPanel = ({ manifestMetadata, itemMetadata }) => {
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
          title="Manifest Metadata"
        >
          <FileText className="w-6 h-6 transition-colors" />
        </button>
        <button
          className={`flex-1 py-2 text-center flex items-center justify-center gap-2 transition-all ${
            activeTab === "item" ? "bg-gray-300 font-bold text-black" : "bg-gray-200 text-gray-500"
          } hover:bg-gray-400`}
          onClick={() => setActiveTab("item")}
          title="Item Metadata"
        >
          <Image className="w-6 h-6 transition-colors" />
        </button>
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-grow overflow-auto p-3 max-h-[calc(100vh-100px)]">
        {activeTab === "manifest" ? (
          <ManifestMetadata manifestMetadata={manifestMetadata} />
        ) : (
          <ItemMetadata itemMetadata={itemMetadata} />
        )}
      </div>
    </div>
  );
};

export default MetadataPanel;
