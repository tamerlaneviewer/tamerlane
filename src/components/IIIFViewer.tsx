import React, { useEffect, useRef } from "react";
import OpenSeadragon from "openseadragon";

// Define props type
interface IIIFViewerProps {
  imageUrl: string;
}

const IIIFViewer: React.FC<IIIFViewerProps> = ({ imageUrl }) => {
  // Use proper typing for refs
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const osdViewerRef = useRef<OpenSeadragon.Viewer | null>(null);

  useEffect(() => {
    console.log("🔄 Updating IIIFViewer with imageUrl:", imageUrl);

    if (!viewerRef.current) {
      console.warn("⚠️ viewerRef is not assigned.");
      return;
    }

    const isIIIF = imageUrl.includes("/info.json");
    const tileSource: string | OpenSeadragon.TileSourceOptions = isIIIF
      ? imageUrl
      : {
          type: "image",
          url: imageUrl, // Load JPGs or standard images as simple images
        };

    // Destroy existing viewer before creating a new one
    if (osdViewerRef.current) {
      console.log("🛑 Destroying existing OpenSeadragon instance...");
      osdViewerRef.current.destroy();
      osdViewerRef.current = null;
    }

    // Initialize OpenSeadragon
    console.log("🚀 Initializing OpenSeadragon with:", tileSource);
    osdViewerRef.current = OpenSeadragon({
      element: viewerRef.current,
      prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
      tileSources: tileSource,
      showNavigator: true,
    });

    // Cleanup function to properly destroy OpenSeadragon on unmount or image change
    return () => {
      if (osdViewerRef.current) {
        console.log("🧹 Cleaning up OpenSeadragon instance...");
        osdViewerRef.current.destroy();
        osdViewerRef.current = null;
      }
    };
  }, [imageUrl]); // Re-run effect when `imageUrl` changes

  return <div ref={viewerRef} className="w-full h-full"></div>;
};

export default IIIFViewer;