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
}

// Function to sanitize annotation text
const renderHTML = (text: string) => {
  const safeString = text.replace(/\n/g, '<br />');
  return { __html: DOMPurify.sanitize(safeString) };
};

const SearchResults: React.FC<SearchResultsProps> = ({
  searchResults,
  onResultClick,
}) => {
  return (
    <div>
      {searchResults.length === 0 ? (
        <p className="text-gray-500 text-center">No search results found.</p>
      ) : (
        searchResults.map((result: IIIFSearchSnippet) => {
          console.log('🔍 Search result snippet:', result);
          const combinedHTML = `${result.prefix ?? ''}<span class="text-blue-600 font-semibold">${result.exact}</span>${result.suffix ?? ''}`;
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
              className="text-sm text-gray-800 p-2 cursor-pointer hover:bg-blue-50 rounded"
              dangerouslySetInnerHTML={renderHTML(combinedHTML)}
            />
          );
        })
      )}
    </div>
  );
};

export default SearchResults;
