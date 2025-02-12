import React, { useEffect, useRef } from 'react';
import OpenSeadragon from 'openseadragon';

const IIIFViewer = ({ manifestUrl }: { manifestUrl?: string }) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const defaultImage = 'https://openseadragon.github.io/example-images/highsmith/highsmith.dzi';

  useEffect(() => {
    if (viewerRef.current) {
      OpenSeadragon({
        id: viewerRef.current.id,
        tileSources: manifestUrl || defaultImage,
        showNavigator: true,
        prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
      });
    }
  }, [manifestUrl]);

  return <div id='iiif-viewer' ref={viewerRef} className='w-3/4 h-screen'></div>;
};

export default IIIFViewer;

