import React from 'react';

const SearchBar = ({ onSearch }: { onSearch: (query: string) => void }) => {
  return (<form className='p-4 flex gap-2'><input type='text' className='border rounded p-2 w-full' placeholder='Search IIIF collections...' /><button className='bg-blue-500 text-white p-2 rounded'>Search</button></form>);
};

export default SearchBar;
