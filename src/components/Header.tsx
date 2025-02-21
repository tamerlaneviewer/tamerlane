import React from "react";
import SearchBar from "./SearchBar.tsx";
import IIIFControls from "./IIIFControls.tsx";
import { ReactComponent as Logo } from "../logo.svg";

interface HeaderProps {
  onSearch: (query: string) => void;
  currentIndex: number;
  totalImages: number;
  totalManifests: number;
  selectedManifestIndex: number;
  onPreviousImage: () => void;
  onNextImage: () => void;
  onPreviousManifest: () => void;
  onNextManifest: () => void;
  resetImageIndex: () => void;
}

const Header: React.FC<HeaderProps> = ({
  onSearch,
  currentIndex,
  totalImages,
  totalManifests,
  selectedManifestIndex, // ✅ Fix: Use manifest index in UI
  onPreviousImage,
  onNextImage,
  onPreviousManifest,
  onNextManifest,
  resetImageIndex,
}) => {
  return (
    <header className="bg-gray-800 text-white p-2 flex items-center justify-between">
      <div className="flex items-center">
        <Logo className="h-12 w-12 fill-slate-600" />
        <span className="text-lg font-semibold">Tamerlane</span>
      </div>

      <IIIFControls
        currentIndex={currentIndex}
        totalImages={totalImages}
        totalManifests={totalManifests}
        selectedManifestIndex={selectedManifestIndex} // ✅ Fix: Pass manifest index
        onPreviousImage={onPreviousImage}
        onNextImage={onNextImage}
        onPreviousManifest={onPreviousManifest}
        onNextManifest={onNextManifest}
        resetImageIndex={resetImageIndex}
      />

      <div>
        <SearchBar onSearch={onSearch} />
      </div>
    </header>
  );
};

export default Header;
