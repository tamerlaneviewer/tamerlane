import React from 'react';
import { IIIFSearchSnippet } from '../types/index.ts';

interface SearchResultsProps {
  searchResults: IIIFSearchSnippet[];
  onResultClick: (canvasTarget: string, manifestId?: string) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  searchResults,
  onResultClick,
}) => {
  return (
    <div>
      {searchResults.length === 0 ? (
        <p className="text-gray-500 text-center">No search results found.</p>
      ) : (
        searchResults.map((result: IIIFSearchSnippet) => (
          <div
            key={result.id}
            onClick={() => onResultClick(result.canvasTarget, result.partOf)} // ✅ make clickable
            className="text-sm text-gray-800 p-2 cursor-pointer hover:bg-blue-50 rounded"
          >
            <span className="text-gray-400">{result.prefix ?? ''}</span>
            <span className="text-blue-600 font-semibold">{result.exact}</span>
            <span className="text-gray-400">{result.suffix ?? ''}</span>
          </div>
        ))
      )}
    </div>
  );
};

export default SearchResults;
