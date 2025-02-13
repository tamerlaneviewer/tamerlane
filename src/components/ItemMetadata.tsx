import React from 'react';

const ItemMetadata = ({ itemMetadata }) => {
  return (
    <div>
      <h2 className='text-lg font-bold mb-2'>Item</h2>
      <pre>{JSON.stringify(itemMetadata, null, 2)}</pre>
    </div>
  );
};

export default ItemMetadata;