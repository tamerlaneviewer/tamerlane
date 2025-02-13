import React, { useState } from 'react';

const SearchBar = ({ onSearch }: { onSearch: (query: string) => void }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className='p-1 flex gap-1'>
      <input
        type='text'
        className='border rounded p-0.5 w-32 text-sm'
        placeholder='Search...'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type='submit' className='bg-blue-500 text-white p-0.5 rounded text-sm'>
        Search
      </button>
    </form>
  );
};

export default SearchBar;