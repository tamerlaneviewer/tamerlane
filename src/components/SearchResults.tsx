import React from 'react';

const SearchResults = ({ searchResults = [] }) => {
  return (
    <div>
      {searchResults.length === 0 ? (
        <p className="text-gray-500 text-center">No search results found.</p>
      ) : (
        searchResults.map((result) => (
          <div key={result.id} className="border p-2 mb-2 rounded bg-white shadow">
            {result.title}
          </div>
        ))
      )}
    </div>
  );
};

export default SearchResults;

