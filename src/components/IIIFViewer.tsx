import React, { useEffect, useRef, useState } from "react";
import OpenSeadragon from "openseadragon";
import SplashScreen from "./SplashScreen.tsx";

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
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
      x: (canvasWidth - imageWidthInCanvas) / 2, // Center horizontally
      y: (canvasHeight - imageHeightInCanvas) / 2, // Center vertically
      width: imageWidthInCanvas,
      height: imageHeightInCanvas,
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

    setIsLoading(true);

    // Initialize OpenSeadragon
    console.log("🚀 Initializing OpenSeadragon with:", tileSource);
    osdViewerRef.current = OpenSeadragon({
      element: viewerRef.current,
      prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
      showNavigator: true,
    });

    // ✅ Detect when the image is fully loaded
    osdViewerRef.current.addTiledImage({
      tileSource: tileSource,
      x: imagePosition.x,
      y: imagePosition.y,
      width: imagePosition.width,
      success: () => {
        console.log("✅ Image loaded successfully!");
        setIsLoading(false); // ✅ Hide SplashScreen when loaded
      },
      error: (error) => {
        console.error("❌ Error loading image:", error);
        setIsLoading(false); // ✅ Hide SplashScreen if error
      },
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

  return (
    <div className="w-full h-full relative">
      {/* Show SplashScreen while loading */}
      {isLoading && <SplashScreen />}

      {/* OpenSeadragon Viewer */}
      <div ref={viewerRef} className="w-full h-full"></div>
    </div>
  );
};

export default IIIFViewer;
