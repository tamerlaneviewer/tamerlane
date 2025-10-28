import React from 'react';
import SearchBar from './SearchBar.tsx';
import IIIFControls from './IIIFControls.tsx';
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

      <div className="hidden md:flex items-center space-x-2">
        <select
          value={selectedLanguage || ''}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="bg-slate-600 text-white px-3 py-2 rounded text-sm hover:bg-slate-500 border-0 min-w-[60px] min-h-[44px] cursor-pointer"
          aria-label="Select annotation language"
          title="Filters annotations and search results by language"
        >
          {availableLanguages.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-slate-700 text-white">
              {lang.code.toUpperCase()}
            </option>
          ))}
        </select>
        <div className="hidden md:block">
          <SearchBar
            onSearch={onSearch}
            autocompleteService={autocompleteUrl}
            searching={searching}
            selectedLanguage={selectedLanguage ?? undefined}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
