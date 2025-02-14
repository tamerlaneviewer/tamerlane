import React from 'react';
import SearchBar from './SearchBar.tsx';
import { ReactComponent as Logo } from '../logo.svg'; 

const Header = ({ onSearch }: { onSearch: (query: string) => void }) => {
  return (
    <header className='bg-gray-800 text-white p-2 flex items-center'>
      <Logo className='h-8 w-8 mr-2' alt='Tamerlane IIIF viewer' />
      <span className='text-lg font-semibold'>Tamerlane</span>
      <div className='ml-auto'>
        <SearchBar onSearch={onSearch} />
      </div>
    </header>
  );
};

export default Header;