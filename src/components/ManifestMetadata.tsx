import React from 'react';

const ManifestMetadata = ({ manifestMetadata }) => {
  return (
    <div>
      <h2 className='text-lg font-bold mb-2'>Manifest</h2>
      <pre>{JSON.stringify(manifestMetadata, null, 2)}</pre>
    </div>
  );
};

export default ManifestMetadata;