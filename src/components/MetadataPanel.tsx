import React, { useState } from "react";
import { FileText, Image } from "lucide-react"; // FileText for Manifest, Image for Item
import ItemMetadata from "./ItemMetadata.tsx";
import ManifestMetadata from "./ManifestMetadata.tsx";

const MetadataPanel = ({ manifestMetadata, itemMetadata }) => {
  const [activeTab, setActiveTab] = useState("manifest");

  return (
    <div className="flex flex-col h-full flex-grow border shadow-md bg-white">
      {/* ✅ Tabs with Icons - Matches AnnotationsPanel */}
      <div className="flex border-b">
        <button
          className={`flex-1 py-2 text-center flex items-center justify-center gap-2 ${
            activeTab === "manifest" ? "bg-gray-300 font-bold" : "bg-gray-200"
          }`}
          onClick={() => setActiveTab("manifest")}
        >
          <FileText
            className={`w-5 h-5 transition-colors ${
              activeTab === "manifest"
                ? "text-black font-bold"
                : "text-gray-500"
            }`}
          />
        </button>
        <button
          className={`flex-1 py-2 text-center flex items-center justify-center gap-2 ${
            activeTab === "item" ? "bg-gray-300 font-bold" : "bg-gray-200"
          }`}
          onClick={() => setActiveTab("item")}
        >
          <Image
            className={`w-5 h-5 transition-colors ${
              activeTab === "item" ? "text-black font-bold" : "text-gray-500"
            }`}
          />
        </button>
      </div>

      {/* ✅ Content - Matches AnnotationsPanel */}
      <div className="flex-grow overflow-auto p-3">
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
