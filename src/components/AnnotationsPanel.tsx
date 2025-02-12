import React from 'react';

const AnnotationsPanel = ({ annotations }: { annotations: any[] }) => {
  return (<div className='w-1/4 bg-white p-4 border-l h-screen overflow-auto'><h2 className='text-lg font-bold mb-2'>Annotations</h2><p>No annotations found.</p></div>);
};

export default AnnotationsPanel;
