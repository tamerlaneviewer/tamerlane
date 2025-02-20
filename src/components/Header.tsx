import React from "react";
import SearchBar from "./SearchBar.tsx";
import IIIFControls from "./IIIFControls.tsx";
import { ReactComponent as Logo } from "../logo.svg";

// ✅ Define the TypeScript interface for props
interface HeaderProps {
  onSearch: (query: string) => void;
  currentIndex: number;
  totalImages: number;
  totalManifests: number;
  onPreviousImage: () => void;
  onNextImage: () => void;
  onPreviousManifest: () => void;
  onNextManifest: () => void;
}

// ✅ Header component with IIIF Controls and Search Bar
const Header: React.FC<HeaderProps> = ({
  onSearch,
  currentIndex,
  totalImages,
  totalManifests,
  onPreviousImage,
  onNextImage,
  onPreviousManifest,
  onNextManifest,
  resetImageIndex,
}) => {
  return (
    <header className="bg-gray-800 text-white p-2 flex items-center justify-between">
      {/* ✅ Left: App Title */}
      <div className="flex items-center">
        <Logo className="h-12 w-12 fill-slate-600" />
        <span className="text-lg font-semibold">Tamerlane</span>
      </div>

      {/* ✅ Center: IIIF Navigation Controls */}
      <IIIFControls
        currentIndex={currentIndex}
        totalImages={totalImages}
        totalManifests={totalManifests}
        onPreviousImage={onPreviousImage}
        onNextImage={onNextImage}
        onPreviousManifest={onPreviousManifest}
        onNextManifest={onNextManifest}
        resetImageIndex={resetImageIndex}
      />

      {/* ✅ Right: Search Bar */}
      <div>
        <SearchBar onSearch={onSearch} />
      </div>
    </header>
  );
};

export default Header;
