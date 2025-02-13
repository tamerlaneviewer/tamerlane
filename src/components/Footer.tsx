// filepath: /home/john/git/tamerlane/src/components/Footer.tsx
import React from 'react';
import Thumbnails from './Thumbnails.tsx';

const Footer = () => {
  return (
    <footer className='bg-gray-800 text-white p-4 flex justify-center items-center fixed bottom-0 w-full'>
      <Thumbnails />
    </footer>
  );
};

export default Footer;