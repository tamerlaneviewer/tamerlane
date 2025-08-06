import React from 'react';
import DOMPurify from 'dompurify';
import { IIIFSearchSnippet } from '../types/index.ts';

interface SearchResultsProps {
  searchResults: IIIFSearchSnippet[];
  onResultClick: (result: IIIFSearchSnippet) => void;
  // This ID should now be the unique ID of the search result snippet itself.
  selectedSearchResultId?: string | null;
  selectedLanguage?: string | null;
}

// Function to sanitize annotation text
const renderHTML = (text: string) => {
  const safeString = text.replace(/\n/g, '<br />');
  return { __html: DOMPurify.sanitize(safeString) };
};

const SearchResults: React.FC<SearchResultsProps> = ({
  searchResults,
  onResultClick,
  selectedSearchResultId,
  selectedLanguage,
}) => {

  return (
    <div>
      {searchResults.length === 0 ? (
        <p className="text-gray-500 text-center">No search results found.</p>
      ) : (
        searchResults
          .filter((result) => {
            if (!selectedLanguage) return true; // No filter if no selected language
            if (!result.language) return true; // No language on the result? Show it
            return result.language === selectedLanguage; // Only match if explicitly matches
          })
          .map((result: IIIFSearchSnippet) => {
            const combinedHTML = `${result.prefix ?? ''}<span class="text-blue-600 font-semibold">${result.exact}</span>${result.suffix ?? ''}`;

            // We now check against the result's own unique ID.
            const isSelected = selectedSearchResultId === result.id;

            return (
              <div
                key={result.id}
                onClick={() => onResultClick(result)}
                className={`mb-1 p-1 cursor-pointer rounded transition-all text-sm text-gray-700 leading-tight ${
                  isSelected
                    ? 'bg-blue-200 border-l-4 border-blue-500'
                    : 'hover:bg-gray-100'
                }`}
                dangerouslySetInnerHTML={renderHTML(combinedHTML)}
              />
            );
          })
      )}
    </div>
  );
};

export default SearchResults;
