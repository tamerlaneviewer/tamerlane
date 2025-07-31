import React, { useEffect, useRef, useState } from 'react';
import OpenSeadragon from 'openseadragon';
import SplashScreen from './SplashScreen.tsx';
import { IIIFAnnotation } from '../types/index';

interface IIIFViewerProps {
  imageUrl: string;
  imageType: 'standard' | 'iiif';
  canvasWidth: number;
  canvasHeight: number;
  imageWidth: number;
  imageHeight: number;
  selectedAnnotation: IIIFAnnotation | null;
  onViewerReady?: () => void;
}

const IIIFViewer: React.FC<IIIFViewerProps> = ({
  imageUrl,
  imageType,
  canvasWidth,
  canvasHeight,
  imageWidth,
  imageHeight,
  selectedAnnotation,
  onViewerReady,
}) => {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const osdViewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!viewerRef.current) return;

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
      tileSource,
      success: () => {
        setIsLoading(false);
        if (onViewerReady) onViewerReady();
      },
      error: (error) => {
        console.error('Error loading image:', error);
        setIsLoading(false);
      },
    });

    return () => {
      if (osdViewerRef.current) {
        osdViewerRef.current.destroy();
        osdViewerRef.current = null;
      }
    };
  }, [
    imageUrl,
    imageType,
    canvasWidth,
    canvasHeight,
    imageWidth,
    imageHeight,
    onViewerReady,
  ]);

  useEffect(() => {
    if (!selectedAnnotation || !osdViewerRef.current) return;

    const viewer = osdViewerRef.current;
    viewer.clearOverlays();

    const overlayRects: OpenSeadragon.Rect[] = [];

    const targets = selectedAnnotation.target;

    for (const target of targets) {
      if (typeof target === 'string') {
        if (target.includes('#xywh=')) {
          const bbox = target.split('#xywh=')[1].split(',').map(Number);
          if (bbox.length !== 4) continue;
          const [x, y, width, height] = bbox;
          const viewportRect = viewer.viewport.imageToViewportRectangle(
            x,
            y,
            width,
            height,
          );
          overlayRects.push(viewportRect);
          const overlayDiv = document.createElement('div');
          overlayDiv.style.position = 'absolute';
          overlayDiv.style.pointerEvents = 'none';
          overlayDiv.style.border = '2px solid red';
          overlayDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
          viewer.addOverlay({ element: overlayDiv, location: viewportRect });
        } else if (target.includes('#svg=')) {
          const svgData = decodeURIComponent(target.split('#svg=')[1]);
          // Create a div to hold the SVG
          const overlayDiv = document.createElement('div');
          overlayDiv.style.position = 'absolute';
          overlayDiv.style.width = '100%';
          overlayDiv.style.height = '100%';

          // Parse and prepare the SVG
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = svgData.trim();
          const svgElem = tempDiv.querySelector('svg');
          if (svgElem) {
            svgElem.setAttribute('width', '100%');
            svgElem.setAttribute('height', '100%');
            // Ensure viewBox matches image dimensions
            if (!svgElem.hasAttribute('viewBox')) {
              svgElem.setAttribute(
                'viewBox',
                `0 0 ${imageWidth} ${imageHeight}`,
              );
            }
            // Ensure stroke/fill are visible for polygons and paths
            const shape = svgElem.querySelector('polygon, path');
            if (shape) {
              if (!shape.getAttribute('stroke'))
                shape.setAttribute('stroke', 'blue');
              if (!shape.getAttribute('stroke-width'))
                shape.setAttribute('stroke-width', '3');
              if (!shape.getAttribute('fill'))
                shape.setAttribute('fill', 'rgba(0,0,255,0.2)');
            }

            // Add the SVG to the overlay div
            overlayDiv.appendChild(svgElem);

            // Add the overlay using standard OpenSeadragon overlay system
            // Create a viewport rectangle for the full image
            const viewportRect = viewer.viewport.imageToViewportRectangle(
              0,
              0,
              imageWidth,
              imageHeight,
            );
            viewer.addOverlay({
              element: overlayDiv,
              location: viewportRect,
            });
          }
        }
      }
    }

    if (overlayRects.length > 0) {
      const unionRect = overlayRects.reduce((acc, rect) => acc.union(rect));
      viewer.viewport.fitBounds(unionRect, {
        immediate: true,
        padding: 0,
      });

      // Optional: zoom in more if narrow
      const aspectRatio = unionRect.width / unionRect.height;
      if (unionRect.width < 0.05 && aspectRatio > 2) {
        const zoom = viewer.viewport.getZoom(true);
        viewer.viewport.zoomTo(zoom * 1.5, unionRect.getCenter(), true);
      }
    }

    viewer.forceRedraw();
  }, [selectedAnnotation, imageWidth, imageHeight]);

  return (
    <div className="w-full h-full relative">
      {isLoading && <SplashScreen />}
      <div ref={viewerRef} className="w-full h-full"></div>
    </div>
  );
};

export default IIIFViewer;
