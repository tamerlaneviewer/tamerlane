import React from 'react';
import SearchBar from './SearchBar.tsx';

const Header = ({ onSearch }: { onSearch: (query: string) => void }) => {
  return (
    <header className='bg-gray-800 text-white p-4 flex items-center'>
      <h1 className='text-xl font-bold mr-4'>IIIF Viewer</h1>
      <div className='ml-auto'>
        <SearchBar onSearch={onSearch} />
      </div>
    </header>
  );
};

export default Header;