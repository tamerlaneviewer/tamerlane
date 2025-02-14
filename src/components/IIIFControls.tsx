import React, { useState } from "react";

const IIIFControls = ({ 
  currentIndex, 
  totalImages, 
  totalManifests, 
  onPreviousImage, 
  onNextImage, 
  onPreviousManifest, 
  onNextManifest 
}: { 
  currentIndex: number; 
  totalImages: number; 
  totalManifests: number; 
  onPreviousImage: () => void; 
  onNextImage: () => void; 
  onPreviousManifest: () => void; 
  onNextManifest: () => void; 
}) => {
  const [mode, setMode] = useState("image"); // "image" or "manifest"

  return (
    <div className="flex items-center space-x-2 bg-gray-800 text-white px-3 py-1 rounded">
      {/* ✅ Navigation Mode Selector */}
      <select 
        className="bg-gray-700 text-white p-1 rounded" 
        value={mode} 
        onChange={(e) => setMode(e.target.value)}
      >
        <option value="image">Images</option>
        <option value="manifest">Manifests</option>
      </select>

      {/* ✅ Navigation Buttons */}
      <button 
        onClick={mode === "image" ? onPreviousImage : onPreviousManifest} 
        className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
      >
        ←
      </button>
      <span className="text-xs font-medium">
        {mode === "image" 
          ? `Image ${currentIndex + 1} / ${totalImages}`
          : `Manifest ${currentIndex + 1} / ${totalManifests}`
        }
      </span>
      <button 
        onClick={mode === "image" ? onNextImage : onNextManifest} 
        className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
      >
        →
      </button>
    </div>
  );
};

export default IIIFControls;
