import React from 'react';
import { IIIFSearchSnippet } from '../types/index.ts'; // Adjust path if needed

interface SearchResultsProps {
  searchResults: IIIFSearchSnippet[];
}

const SearchResults: React.FC<SearchResultsProps> = ({ searchResults }) => {
  return (
    <div>
      {searchResults.length === 0 ? (
        <p className="text-gray-500 text-center">No search results found.</p>
      ) : (
        searchResults.map((result: IIIFSearchSnippet) => (
          <div key={result.id} className="text-sm text-gray-800 p-2">
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
