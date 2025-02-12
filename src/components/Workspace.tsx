import React, { useState } from 'react';

const Workspace = () => {
  const [savedSearches, setSavedSearches] = useState<string[]>([]);
  return (<div className='fixed bottom-0 w-full bg-gray-800 text-white p-4 flex justify-between'><h3 className='font-bold'>Saved Searches</h3><button className='bg-blue-500 px-4 py-2 rounded'>Save Search</button></div>);
};

export default Workspace;
