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

  const isViewerFocused = () => {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return false;
    // When the OSD canvas is focused, it lives inside our container div
    const viewer = document.getElementById('iiif-viewer');
    return !!(viewer && active && (active === viewer || viewer.contains(active)));
  };

  const isModalOpen = () => {
    // If an accessible modal dialog is open, don't change images/manifests behind it
    const dlg = document.querySelector('[role="dialog"][aria-modal="true"]') as HTMLElement | null;
    return !!dlg;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping() || isModalOpen()) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      // Global shortcuts that always work
      if (e.key === '[' || e.key === 'PageUp') {
        if (isViewerFocused()) return; // don't steal from OSD when focused
        e.preventDefault();
        mode === 'image' ? onPreviousImage() : onPreviousManifest();
        return;
      }
      if (e.key === ']' || e.key === 'PageDown') {
        if (isViewerFocused()) return;
        e.preventDefault();
        mode === 'image' ? onNextImage() : onNextManifest();
        return;
      }

      // Arrow keys only navigate when the deep-zoom viewer isn't focused
      if (isViewerFocused()) return;

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
        className="bg-gray-700 text-white p-2 rounded min-w-[44px] min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        value={mode}
        onChange={handleModeChange}
      >
        <option value="image">Images</option>
        <option value="manifest">Manifests</option>
      </select>

      {/* Previous Button */}
      <button
        onClick={mode === 'image' ? onPreviousImage : onPreviousManifest}
        className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition min-w-[44px] min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
        className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition min-w-[44px] min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label={mode === 'image' ? 'Next image' : 'Next manifest'}
      >
        →
      </button>
    </div>
  );
};

export default IIIFControls;
