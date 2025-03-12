import React, { useEffect, useRef, useState } from 'react';
import OpenSeadragon from 'openseadragon';
import SplashScreen from './SplashScreen.tsx';
import { AnnotationText } from '../types/index';

// Define props type
interface IIIFViewerProps {
  imageUrl: string;
  imageType: 'standard' | 'iiif';
  canvasWidth: number;
  canvasHeight: number;
  imageWidth: number;
  imageHeight: number;
  selectedAnnotation: AnnotationText | null;
}

const IIIFViewer: React.FC<IIIFViewerProps> = ({
  imageUrl,
  imageType,
  canvasWidth,
  canvasHeight,
  imageWidth,
  imageHeight,
  selectedAnnotation,
}) => {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const osdViewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log('🔄 Initializing IIIFViewer:', {
      imageUrl,
      imageType,
      canvasWidth,
      canvasHeight,
      imageWidth,
      imageHeight,
    });

    if (!viewerRef.current) {
      console.warn('⚠️ viewerRef is not assigned.');
      return;
    }

    const tileSource: string | OpenSeadragon.TileSourceOptions =
      imageType === 'iiif' ? imageUrl : { type: 'image', url: imageUrl };

    if (osdViewerRef.current) {
      osdViewerRef.current.destroy();
      osdViewerRef.current = null;
    }

    setIsLoading(true);

    osdViewerRef.current = OpenSeadragon({
      element: viewerRef.current,
      prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
      showNavigator: true,
      crossOriginPolicy: 'Anonymous',
    });

    osdViewerRef.current.addTiledImage({
      tileSource: tileSource,
      success: () => {
        console.log('✅ Image loaded successfully!');
        setIsLoading(false);
      },
      error: (error) => {
        console.error('❌ Error loading image:', error);
        setIsLoading(false);
      },
    });

    return () => {
      if (osdViewerRef.current) {
        osdViewerRef.current.destroy();
        osdViewerRef.current = null;
      }
    };
  }, [imageUrl, imageType, canvasWidth, canvasHeight, imageWidth, imageHeight]);

  useEffect(() => {
    if (!selectedAnnotation || !osdViewerRef.current) return;

    console.log(
      '🖼 Highlighting bounding box for annotation:',
      selectedAnnotation,
    );

    const target = selectedAnnotation.target;
    let bbox: number[] | null = null;

    if (typeof target === 'string' && target.includes('#xywh=')) {
      bbox = target.split('#xywh=')[1].split(',').map(Number);
    } else if (
      typeof target === 'object' &&
      'id' in target &&
      target.id.includes('#xywh=')
    ) {
      bbox = target.id.split('#xywh=')[1].split(',').map(Number);
    }

    if (!bbox || bbox.length !== 4) return;
    const [x, y, width, height] = bbox;

    // Convert annotation coordinates to viewport coordinates
    const viewportRect = osdViewerRef.current.viewport.imageToViewportRectangle(
      x,
      y,
      width,
      height,
    );
    console.log('📏 Converted Bounding Box:', viewportRect);

    // Ensure the overlay div exists or create a new one
    let overlayDiv = overlayRef.current;
    if (!overlayDiv) {
      overlayDiv = document.createElement('div');
      overlayDiv.style.position = 'absolute';
      overlayDiv.style.pointerEvents = 'none';
      overlayDiv.style.border = '2px solid red';
      overlayDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
      overlayDiv.id = 'annotation-overlay';
      overlayRef.current = overlayDiv;
    }

    // Remove any previous overlays
    osdViewerRef.current.clearOverlays();

    // Set new overlay position relative to OpenSeadragon’s viewport
    osdViewerRef.current.addOverlay({
      element: overlayDiv,
      location: viewportRect,
    });

    // Force OpenSeadragon to refresh & display the overlay
    osdViewerRef.current.forceRedraw();
  }, [selectedAnnotation]);

  return (
    <div className="w-full h-full relative">
      {isLoading && <SplashScreen />}

      {/* OpenSeadragon Viewer */}
      <div ref={viewerRef} className="w-full h-full"></div>
    </div>
  );
};

export default IIIFViewer;
