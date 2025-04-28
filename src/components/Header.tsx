import React, { useState } from 'react';
import SearchBar from './SearchBar.tsx';
import IIIFControls from './IIIFControls.tsx';
import { ReactComponent as Logo } from '../logo.svg';

interface HeaderProps {
  onSearch: (query: string) => void;
  autocompleteUrl: string;
  currentIndex: number;
  totalImages: number;
  totalManifests: number;
  selectedManifestIndex: number;
  onPreviousImage: () => void;
  onNextImage: () => void;
  onPreviousManifest: () => void;
  onNextManifest: () => void;
  resetImageIndex: () => void;
  onLanguageChange: (lang: string) => void;
  selectedLanguage: string | null;
}

const availableLanguages = [
  { code: 'en', name: 'English' },
  { code: 'la', name: 'Latin' },
];

const Header: React.FC<HeaderProps> = ({
  onSearch,
  currentIndex,
  totalImages,
  totalManifests,
  selectedManifestIndex,
  onPreviousImage,
  onNextImage,
  onPreviousManifest,
  onNextManifest,
  resetImageIndex,
  autocompleteUrl,
  onLanguageChange,
  selectedLanguage,
}) => {
  const [languageIndex, setLanguageIndex] = useState(0);
  const currentLanguage = availableLanguages[languageIndex];

  const toggleLanguage = () => {
    const nextIndex = (languageIndex + 1) % availableLanguages.length;
    setLanguageIndex(nextIndex);
    onLanguageChange(availableLanguages[nextIndex].code); // Ensure this calls the handler
  };

  return (
    <header className="bg-gray-800 text-white p-2 flex items-center justify-between">
      <div className="flex items-center">
        <Logo className="h-12 w-12 fill-slate-600" />
        <span className="text-lg font-semibold ml-2">Tamerlane</span>
      </div>

      <IIIFControls
        currentIndex={currentIndex}
        totalImages={totalImages}
        totalManifests={totalManifests}
        selectedManifestIndex={selectedManifestIndex}
        onPreviousImage={onPreviousImage}
        onNextImage={onNextImage}
        onPreviousManifest={onPreviousManifest}
        onNextManifest={onNextManifest}
        resetImageIndex={resetImageIndex}
      />

      <div className="flex items-center space-x-2">
        <button
          onClick={toggleLanguage}
          className="bg-slate-600 text-white px-2 py-1 rounded text-sm hover:bg-slate-500"
          title={currentLanguage.name}
        >
          {currentLanguage.code.toUpperCase()}
        </button>
        <SearchBar
          onSearch={onSearch}
          autocompleteService={autocompleteUrl}
          selectedLanguage={selectedLanguage}
        />
      </div>
    </header>
  );
};

export default Header;
