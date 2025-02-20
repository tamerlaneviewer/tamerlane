import React, { useEffect, useRef } from "react";
import OpenSeadragon from "openseadragon";

// Define props type
interface IIIFViewerProps {
  imageUrl: string;
  imageType: "standard" | "iiif";
  canvasWidth: number;
  canvasHeight: number;
  imageWidth: number;
  imageHeight: number;
}

const IIIFViewer: React.FC<IIIFViewerProps> = ({
  imageUrl,
  imageType,
  canvasWidth,
  canvasHeight,
  imageWidth,
  imageHeight,
}) => {
  // Use proper typing for refs
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const osdViewerRef = useRef<OpenSeadragon.Viewer | null>(null);

  useEffect(() => {
    console.log(
      "🔄 Updating IIIFViewer with imageUrl:",
      imageUrl,
      "and imageType:",
      imageType,
      "and canvasHeight:",
      canvasHeight,
      "and canvasWidth:",
      canvasWidth,
      "and imageHeight:",
      imageHeight,
      "and imageWidth:",
      imageWidth       
    );

    if (!viewerRef.current) {
      console.warn("⚠️ viewerRef is not assigned.");
      return;
    }

    // Compute scaling to fit image into canvas space
    const aspectRatio = imageWidth / imageHeight;
    const imageWidthInCanvas = canvasWidth;
    const imageHeightInCanvas = canvasWidth / aspectRatio; // Maintain aspect ratio

    const imagePosition = {
      x: (canvasWidth - imageWidthInCanvas) / 2,  // Center horizontally
      y: (canvasHeight - imageHeightInCanvas) / 2, // Center vertically
      width: imageWidthInCanvas,
      height: imageHeightInCanvas 
    };
    

    const tileSource: string | OpenSeadragon.TileSourceOptions =
      imageType === "iiif"
        ? imageUrl
        : {
            type: "image",
            url: imageUrl, // Load standard images as simple images
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
      showNavigator: true,
    });

    // Add image at correct position & scale
    osdViewerRef.current.addTiledImage({
      tileSource: tileSource,
      x: imagePosition.x,
      y: imagePosition.y,
      width: imagePosition.width
    });

    // Cleanup function to properly destroy OpenSeadragon on unmount or image change
    return () => {
      if (osdViewerRef.current) {
        console.log("🧹 Cleaning up OpenSeadragon instance...");
        osdViewerRef.current.destroy();
        osdViewerRef.current = null;
      }
    };
  }, [imageUrl, imageType, canvasWidth, canvasHeight, imageWidth, imageHeight]);

  return <div ref={viewerRef} className="w-full h-full"></div>;
};

export default IIIFViewer;
