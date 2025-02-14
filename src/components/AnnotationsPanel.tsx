import React, { useState } from "react";
import { BookOpen, Search } from "lucide-react";

const AnnotationsPanel = ({ annotations, searchResults }: { annotations: any[], searchResults: any[] }) => {
  const [activeTab, setActiveTab] = useState("annotations");

  return (
    <div className="flex flex-col h-full border shadow-md bg-white">
      {/* ✅ Tabs with Icons - Matches MetadataPanel */}
      <div className="flex border-b">
        <button
          className={`flex-1 py-2 text-center flex items-center justify-center gap-2 ${
            activeTab === "annotations" ? "bg-gray-300 font-bold" : "bg-gray-200"
          }`}
          onClick={() => setActiveTab("annotations")}
        >
          <BookOpen className={`w-5 h-5 transition-colors ${activeTab === "annotations" ? "text-black font-bold" : "text-gray-500"}`} />
        </button>
        <button
          className={`flex-1 py-2 text-center flex items-center justify-center gap-2 ${
            activeTab === "searchResults" ? "bg-gray-300 font-bold" : "bg-gray-200"
          }`}
          onClick={() => setActiveTab("searchResults")}
        >
          <Search className={`w-5 h-5 transition-colors ${activeTab === "searchResults" ? "text-black font-bold" : "text-gray-500"}`} />
        </button>
      </div>

      {/* ✅ Content - Matches MetadataPanel */}
      <div className="flex-grow overflow-auto p-3">
        {activeTab === "annotations" ? (
          annotations.length === 0 ? (
            <p className="text-gray-500">No annotations available.</p>
          ) : (
            annotations.map((annotation, index) => (
              <div key={index} className="border p-2 mb-2 rounded bg-white shadow">
                {annotation.text}
              </div>
            ))
          )
        ) : (
          searchResults.length === 0 ? (
            <p className="text-gray-500">No search results found.</p>
          ) : (
            searchResults.map((result, index) => (
              <div key={index} className="border p-2 mb-2 rounded bg-white shadow">
                {result.title}
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};

export default AnnotationsPanel;
