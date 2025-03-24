import React from 'react';
import DOMPurify from 'dompurify';
import { IIIFSearchSnippet } from '../types/index.ts';

interface SearchResultsProps {
  searchResults: IIIFSearchSnippet[];
  onResultClick: (
    canvasTarget: string,
    manifestId?: string,
    searchResultId?: string,
  ) => void;
  selectedSearchResultId?: string | null;
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
}) => {
  return (
    <div>
      {searchResults.length === 0 ? (
        <p className="text-gray-500 text-center">No search results found.</p>
      ) : (
        searchResults.map((result: IIIFSearchSnippet) => {
          const combinedHTML = `${result.prefix ?? ''}<span class="text-blue-600 font-semibold">${result.exact}</span>${result.suffix ?? ''}`;

          const isSelected = selectedSearchResultId === result.annotationId; // Highlight condition

          return (
            <div
              key={result.id}
              onClick={() =>
                onResultClick(
                  result.canvasTarget,
                  result.partOf,
                  result.annotationId,
                )
              }
              className={`text-sm text-gray-800 p-2 cursor-pointer rounded transition-all ${
                isSelected
                  ? 'bg-yellow-100 border-l-4 border-yellow-500'
                  : 'hover:bg-blue-50'
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
