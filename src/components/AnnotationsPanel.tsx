import React, { useState } from "react";
import { BookOpen, Search } from "lucide-react";
import AnnotationsList from "./AnnotationsList.tsx";
import { AnnotationText } from "../types/index"; // Ensure correct import

// ✅ Explicitly define the expected prop types
interface AnnotationsPanelProps {
  annotations: AnnotationText[];
  searchResults: { title: string }[];
}

const AnnotationsPanel: React.FC<AnnotationsPanelProps> = ({ annotations, searchResults }) => {
  const [activeTab, setActiveTab] = useState<"annotations" | "searchResults">("annotations");

  return (
    <div className="flex flex-col h-full border shadow-md bg-white">
      {/* Tabs Section */}
      <div className="flex border-b">
        <button
          className={`flex-1 py-2 text-center flex items-center justify-center gap-2 ${
            activeTab === "annotations" ? "bg-gray-300 font-bold" : "bg-gray-200"
          }`}
          onClick={() => setActiveTab("annotations")}
        >
          <BookOpen className="w-5 h-5 transition-colors text-gray-500" />
        </button>
        <button
          className={`flex-1 py-2 text-center flex items-center justify-center gap-2 ${
            activeTab === "searchResults" ? "bg-gray-300 font-bold" : "bg-gray-200"
          }`}
          onClick={() => setActiveTab("searchResults")}
        >
          <Search className="w-5 h-5 transition-colors text-gray-500" />
        </button>
      </div>

      {/* ✅ Scrollable Content Section */}
      <div className="flex-grow overflow-y-auto p-3 max-h-[400px]">
        {activeTab === "annotations" ? (
          annotations.length === 0 ? (
            <p className="text-gray-500">No annotations available.</p>
          ) : (
            <AnnotationsList annotations={annotations} />
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
