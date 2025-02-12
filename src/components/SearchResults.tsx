import React from 'react';

const SearchResults = ({ results, onSelectManifest }: { results: any[], onSelectManifest: (id: string) => void }) => {
  return (<div className='w-1/4 bg-gray-100 p-4 h-screen overflow-auto'><h2 className='text-lg font-bold mb-2'>Search Results</h2><p>No results found.</p></div>);
};

export default SearchResults;
