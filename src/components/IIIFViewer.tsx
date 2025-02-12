import React, { useEffect, useRef } from "react";
import OpenSeadragon from "openseadragon";

const IIIFViewer = () => {
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewerRef.current) {
      const osdViewer = OpenSeadragon({
        element: viewerRef.current,
        tileSources: "https://iiif.io/api/image/3.0/example/reference/918ecd18c2592080851777620de9bcb5-gottingen/info.json",
        showNavigator: true,
        prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
      });

      return () => {
        osdViewer.destroy(); // Clean up the viewer when unmounting
      };
    }
  }, []); // Empty dependency array ensures this effect runs only once

  return <div id="iiif-viewer" ref={viewerRef} className="w-full h-screen"></div>;
};

export default IIIFViewer;