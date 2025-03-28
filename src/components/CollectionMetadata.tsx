import React from 'react';

const CollectionMetadata = ({ CollectionMetadata }) => {
  return (
    <div>
      <h2 className='text-lg font-bold mb-2'>Item</h2>
      <pre>{JSON.stringify(CollectionMetadata, null, 2)}</pre>
    </div>
  );
};

export default CollectionMetadata;