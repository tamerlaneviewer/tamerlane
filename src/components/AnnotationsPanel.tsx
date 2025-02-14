import React, { useState } from "react";

const AnnotationsPanel = ({ annotations, searchResults }: { annotations: any[], searchResults: any[] }) => {
  const [activeTab, setActiveTab] = useState("annotations");

  return (
    <div className="h-full flex flex-col">
      {/* ✅ Tabs Navigation */}
      <div className="flex border-b">
        <button
          className={`flex-1 py-2 text-center ${
            activeTab === "annotations" ? "bg-gray-300 font-bold" : "bg-gray-200"
          }`}
          onClick={() => setActiveTab("annotations")}
        >
          Annotations
        </button>
        <button
          className={`flex-1 py-2 text-center ${
            activeTab === "searchResults" ? "bg-gray-300 font-bold" : "bg-gray-200"
          }`}
          onClick={() => setActiveTab("searchResults")}
        >
          Search Results
        </button>
      </div>

      {/* ✅ Tab Content */}
      <div className="flex-grow overflow-auto p-3">
        {activeTab === "annotations" ? (
          annotations.length === 0 ? (
            <p className="text-gray-500">No annotations available.</p>
          ) : (
            annotations.map((annotation, index) => (
              <div key={index} className="border p-2 mb-2 rounded">
                {annotation.text}
              </div>
            ))
          )
        ) : (
          searchResults.length === 0 ? (
            <p className="text-gray-500">No search results found.</p>
          ) : (
            searchResults.map((result, index) => (
              <div key={index} className="border p-2 mb-2 rounded">
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
