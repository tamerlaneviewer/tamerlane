import React, { useEffect, useRef } from 'react';
import OpenSeadragon from 'openseadragon';

const IIIFViewer = ({ manifestUrl }: { manifestUrl: string }) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (viewerRef.current) {
      OpenSeadragon({ id: viewerRef.current.id, tileSources: manifestUrl, showNavigator: true });
    }
  }, [manifestUrl]);
  return <div id='iiif-viewer' ref={viewerRef} className='w-3/4 h-screen'></div>;
};

export default IIIFViewer;
