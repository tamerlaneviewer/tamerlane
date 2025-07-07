import React, { useState, useEffect } from 'react';

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
  const [mode, setMode] = useState<'image' | 'manifest'>('image');

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value as 'image' | 'manifest';
    setMode(newMode);
    if (newMode === 'manifest') {
      resetImageIndex(); // Reset item index when switching to manifests
    }
  };

  const isTyping = () => {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    return (
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      (el as HTMLElement).isContentEditable
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping()) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        mode === 'image' ? onPreviousImage() : onPreviousManifest();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        mode === 'image' ? onNextImage() : onNextManifest();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, onPreviousImage, onNextImage, onPreviousManifest, onNextManifest]);

  return (
    <div className="flex items-center space-x-2 bg-gray-800 text-white px-3 py-1 rounded">
      {/* Mode Selector */}
      <label htmlFor="iiif-mode" className="sr-only">
        Navigation Mode
      </label>
      <select
        id="iiif-mode"
        className="bg-gray-700 text-white p-1 rounded"
        value={mode}
        onChange={handleModeChange}
      >
        <option value="image">Images</option>
        <option value="manifest">Manifests</option>
      </select>

      {/* Previous Button */}
      <button
        onClick={mode === 'image' ? onPreviousImage : onPreviousManifest}
        className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
        aria-label={mode === 'image' ? 'Previous image' : 'Previous manifest'}
      >
        ←
      </button>

      {/* Status Display */}
      <span className="text-xs font-medium">
        {mode === 'image'
          ? `Item ${currentIndex + 1} / ${totalImages}`
          : `Manifest ${selectedManifestIndex + 1} / ${totalManifests}`}
      </span>

      {/* Next Button */}
      <button
        onClick={mode === 'image' ? onNextImage : onNextManifest}
        className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
        aria-label={mode === 'image' ? 'Next image' : 'Next manifest'}
      >
        →
      </button>
    </div>
  );
};

export default IIIFControls;
