import React, { useState } from "react";

const IIIFControls = ({
  currentIndex,
  totalImages,
  totalManifests,
  selectedManifestIndex, 
  onPreviousImage,
  onNextImage,
  onPreviousManifest,
  onNextManifest,
  resetImageIndex,
}: {
  currentIndex: number;
  totalImages: number;
  totalManifests: number;
  selectedManifestIndex: number; 
  onPreviousImage: () => void;
  onNextImage: () => void;
  onPreviousManifest: () => void;
  onNextManifest: () => void;
  resetImageIndex: () => void;
}) => {
  const [mode, setMode] = useState<"image" | "manifest">("image");

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value as "image" | "manifest";
    setMode(newMode);
    if (newMode === "manifest") {
      resetImageIndex(); // Reset item index when switching to manifests
    }
  };

  return (
    <div className="flex items-center space-x-2 bg-gray-800 text-white px-3 py-1 rounded">
      {/* Mode Selector */}
      <select
        className="bg-gray-700 text-white p-1 rounded"
        value={mode}
        onChange={handleModeChange}
      >
        <option value="image">Images</option>
        <option value="manifest">Manifests</option>
      </select>

      {/* Navigation Buttons */}
      <button
        onClick={mode === "image" ? onPreviousImage : onPreviousManifest}
        className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
      >
        ←
      </button>

      {/* Display Correct Navigation Info */}
      <span className="text-xs font-medium">
        {mode === "image"
          ? `Item ${currentIndex + 1} / ${totalImages}`
          : `Manifest ${selectedManifestIndex + 1} / ${totalManifests}`}
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
