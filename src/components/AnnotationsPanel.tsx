import React, { useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import AnnotationsList from './AnnotationsList.tsx';
import { AnnotationText } from '../types/index'; // Ensure correct import

interface AnnotationsPanelProps {
  annotations: AnnotationText[];
  searchResults: { title: string }[];
  onAnnotationSelect: (annotation: AnnotationText) => void;
}

const AnnotationsPanel: React.FC<AnnotationsPanelProps> = ({
  annotations,
  searchResults,
  onAnnotationSelect, 
}) => {
  const [activeTab, setActiveTab] = useState<'annotations' | 'searchResults'>(
    'annotations',
  );

  return (
    <div className="flex flex-col h-full max-h-full border shadow-md bg-white">
      {/* Tabs Section */}
      <div className="flex border-b">
        <button
          className={`flex-1 py-2 text-center flex items-center justify-center gap-2 transition-all ${
            activeTab === 'annotations'
              ? 'bg-gray-300 font-bold text-black'
              : 'bg-gray-200 text-gray-500'
          } hover:bg-gray-400`}
          onClick={() => setActiveTab('annotations')}
          title="Annotations"
        >
          <BookOpen className="w-6 h-6 transition-colors" />
        </button>
        <button
          className={`flex-1 py-2 text-center flex items-center justify-center gap-2 transition-all ${
            activeTab === 'searchResults'
              ? 'bg-gray-300 font-bold text-black'
              : 'bg-gray-200 text-gray-500'
          } hover:bg-gray-400`}
          onClick={() => setActiveTab('searchResults')}
          title="Search Results"
        >
          <Search className="w-6 h-6 transition-colors" />
        </button>
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-grow overflow-y-auto p-3 max-h-[calc(100vh-100px)]">
        {activeTab === 'annotations' ? (
          annotations.length === 0 ? (
            <p className="text-gray-500">No annotations available.</p>
          ) : (
            <AnnotationsList
              annotations={annotations}
              onAnnotationSelect={onAnnotationSelect}
            />
          )
        ) : searchResults.length === 0 ? (
          <p className="text-gray-500">No search results found.</p>
        ) : (
          searchResults.map((result, index) => (
            <div
              key={index}
              className="border p-2 mb-2 rounded bg-white shadow"
            >
              {result.title}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AnnotationsPanel;
