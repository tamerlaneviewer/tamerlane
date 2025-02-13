import React from 'react';

interface SearchResult {
  id: number;
  title: string;
}

interface SearchResultsProps {
  results: SearchResult[];
}

const SearchResults: React.FC<SearchResultsProps> = ({ results }) => {
  return (
    <div className='p-4'>
      <h2 className='text-lg font-bold mb-2'>Search Results</h2>
      <ul>
        {results.map(result => (
          <li key={result.id} className='mb-2'>
            <span className='text-blue-500'>{result.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SearchResults;
