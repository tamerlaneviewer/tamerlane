import React, { useEffect, useRef } from "react";
import OpenSeadragon from "openseadragon";

const IIIFViewer = ({ imageUrl }: { imageUrl: string }) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const osdViewerRef = useRef<any>(null);

  useEffect(() => {
    if (!viewerRef.current) return;

    const isIIIF = imageUrl.endsWith("/info.json"); // ✅ Detect if it's a IIIF Image API source
    const tileSource = isIIIF
      ? imageUrl
      : {
          type: "image",
          url: imageUrl, // ✅ Load JPGs or standard images as simple images
        };

    if (!osdViewerRef.current) {
      // ✅ Initialize OpenSeadragon
      osdViewerRef.current = OpenSeadragon({
        element: viewerRef.current,
        prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
        tileSources: tileSource,
        showNavigator: true,
      });
    } else {
      // ✅ Update image dynamically when changed
      osdViewerRef.current.open(tileSource);
    }
  }, [imageUrl]); // ✅ Re-run effect when `imageUrl` changes

  return <div id="iiif-viewer" ref={viewerRef} className="w-full h-full"></div>;
};

export default IIIFViewer;
