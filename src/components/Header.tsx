import React from 'react';
import SearchBar from './SearchBar.tsx';
import IIIFControls from './IIIFControls.tsx';
import FilterPanel from './FilterPanel.tsx';
import { APP_NAME, SHOW_LOGO } from '../config/appConfig.ts';

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
  searching: boolean;
  availableLanguages: Array<{ code: string; name: string }>;
  selectedMotivation: string | null;
  onMotivationSelect: (motivation: string | null) => void;
}

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
  searching = false,
  availableLanguages,
  selectedMotivation,
  onMotivationSelect,
}) => {

  return (
    <header className="bg-gray-800 text-white p-2 flex items-center justify-between md:justify-between" role="banner">
      <div className="flex items-center">
        {SHOW_LOGO && (
          <img
            src={`${process.env.PUBLIC_URL}/logo.svg`}
            alt="Tamerlane IIIF Viewer logo"
            className="h-12 w-12"
          />
        )}
        <h1 className="hidden md:inline text-lg font-semibold ml-2">{APP_NAME}</h1>
      </div>

      <div className="flex-1 flex justify-center md:justify-start md:flex-initial">
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
      </div>

      <div className="hidden md:flex items-center gap-2">
        <FilterPanel
          availableLanguages={availableLanguages}
          selectedLanguage={selectedLanguage}
          onLanguageChange={onLanguageChange}
          selectedMotivation={selectedMotivation}
          onMotivationSelect={onMotivationSelect}
        />
        <div className="w-px h-5 bg-slate-500" aria-hidden="true" />
        <SearchBar
          onSearch={onSearch}
          autocompleteService={autocompleteUrl}
          searching={searching}
          selectedLanguage={selectedLanguage ?? undefined}
        />
      </div>
    </header>
  );
};

export default Header;
