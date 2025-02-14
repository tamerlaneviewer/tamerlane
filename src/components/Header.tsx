import React from 'react';
import SearchBar from './SearchBar.tsx';

const Header = ({ onSearch }: { onSearch: (query: string) => void }) => {
  return (
    <header className='bg-gray-800 text-white p-2 flex items-center'>
      <span className='text-lg font-semibold'>Tamerlane</span>
      <div className='ml-auto'>
        <SearchBar onSearch={onSearch} />
      </div>
    </header>
  );
};

export default Header;