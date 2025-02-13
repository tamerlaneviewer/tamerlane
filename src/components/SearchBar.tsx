// filepath: /home/john/git/tamerlane/src/components/SearchBar.tsx
import React, { useState } from 'react';

const SearchBar = ({ onSearch }: { onSearch: (query: string) => void }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className='p-4 flex gap-2'>
      <input
        type='text'
        className='border rounded p-2 w-full'
        placeholder='Search IIIF collections...'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type='submit' className='bg-blue-500 text-white p-2 rounded'>
        Search
      </button>
    </form>
  );
};

export default SearchBar;
