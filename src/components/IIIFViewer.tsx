import React, { useEffect, useRef, useState } from 'react';
import OpenSeadragon from 'openseadragon';
import SplashScreen from './SplashScreen.tsx';
import { IIIFAnnotation, IIIFImage } from '../types/index';
import { sanitizeSvg } from '../utils/sanitizeSvg.ts';
import { ensureHttps } from '../utils/ensureHttps.ts';
import { computeSvgPixelBounds } from '../utils/svgBounds.ts';
import { logger } from '../utils/logger.ts';

interface IIIFViewerProps {
  images: IIIFImage[];
  canvasWidth: number;
  canvasHeight: number;
  selectedAnnotation: IIIFAnnotation | null;
  regionTarget?: string | null;
  onViewerReady?: () => void;
  onImageLoadError: (message: string) => void;
}

/** Parse an optional #xywh= fragment from a canvas target URI. */
function parseXywh(canvasTarget: string): { x: number; y: number; w: number; h: number } | null {
  const match = canvasTarget.match(/#xywh=(-?\d+),(-?\d+),(\d+),(\d+)/);
  if (!match) return null;
  return { x: Number(match[1]), y: Number(match[2]), w: Number(match[3]), h: Number(match[4]) };
}

const IIIFViewer: React.FC<IIIFViewerProps> = ({
  images,
  canvasWidth,
  canvasHeight,
  selectedAnnotation,
  regionTarget,
  onViewerReady,
  onImageLoadError,
}) => {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const osdViewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  // The bare canvas identity currently shown. When only the images change but
  // the canvas is the same (e.g. switching a Choice option), we swap the tiled
  // images in place on the existing viewer so the zoom/pan is preserved for
  // comparison. Navigating to a different canvas rebuilds the viewer (reset).
  const lastCanvasKeyRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Destroy the OpenSeadragon instance only when the component unmounts, not on
  // every images change — that would force a home-fit and lose the viewport.
  useEffect(() => {
    return () => {
      if (osdViewerRef.current) {
        osdViewerRef.current.destroy();
        osdViewerRef.current = null;
      }
      lastCanvasKeyRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!viewerRef.current || images.length === 0) return;

    // Build a placement spec for each image on this canvas. When the canvas
    // target includes an #xywh= fragment, the image is positioned at that
    // region (in canvas-pixel space) rather than covering the full canvas. OSD
    // world coordinates are normalised so the full canvas width = 1.
    const items = images.map((image) => {
      const safeUrl = ensureHttps(image.imageUrl);
      const src: string | OpenSeadragon.TileSourceOptions =
        image.imageType === 'iiif'
          ? safeUrl
          : { type: 'image', url: safeUrl };

      const xywh = parseXywh(image.canvasTarget);
      if (xywh && canvasWidth > 0) {
        return {
          tileSource: src,
          x: xywh.x / canvasWidth,
          y: xywh.y / canvasWidth,
          width: xywh.w / canvasWidth,
        };
      }
      // No position fragment – image covers the full canvas.
      return { tileSource: src, x: 0, y: 0, width: 1 };
    });

    // The bare canvas identity (fragment stripped). All images on a canvas
    // share this, so a change here means we navigated to a different canvas.
    const canvasKey = images[0].canvasTarget.replace(/#.*$/, '');
    const sameCanvas = lastCanvasKeyRef.current === canvasKey;
    lastCanvasKeyRef.current = canvasKey;

    // Same canvas + live viewer → swap tiled images in place, keeping the
    // viewport untouched. Overlays (annotation regions) also persist.
    if (sameCanvas && osdViewerRef.current) {
      const viewer = osdViewerRef.current;
      // Capture the exact current viewport so we can restore it after the swap
      // (comparison UX: switching a Choice option must not move the image).
      const bounds = viewer.viewport.getBounds(true);
      // Snapshot the existing world items so we can remove them only *after*
      // the replacements have loaded — this avoids emptying the world, which
      // makes OpenSeadragon treat the next add as a fresh "open" and home-fit.
      const oldItems: any[] = [];
      for (let i = 0; i < viewer.world.getItemCount(); i++) {
        oldItems.push(viewer.world.getItemAt(i));
      }
      let remaining = items.length;
      const finalize = () => {
        remaining -= 1;
        if (remaining > 0) return;
        // New images are in; drop the previous ones and restore the viewport.
        oldItems.forEach((item) => item && viewer.world.removeItem(item));
        try {
          viewer.viewport.fitBounds(bounds, true);
        } catch {
          /* ignore – viewport already correct */
        }
      };
      // Add in array order so later images stack on top (composition/detail).
      items.forEach((item) => {
        viewer.addTiledImage({
          tileSource: item.tileSource,
          x: item.x,
          y: item.y,
          width: item.width,
          success: finalize,
        });
      });
      return;
    }

    // First load or different canvas → (re)create the viewer, resetting the view.
    if (osdViewerRef.current) {
      osdViewerRef.current.destroy();
      osdViewerRef.current = null;
    }

    setIsLoading(true);

    const viewer = OpenSeadragon({
      element: viewerRef.current,
      prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
      tileSources: items,
      showNavigator: true,
      crossOriginPolicy: 'Anonymous',
      maxZoomPixelRatio: 10,
    });
    osdViewerRef.current = viewer;

    viewer.addHandler('open', () => {
      setIsLoading(false);
      if (onViewerReady) onViewerReady();
    });

    viewer.addHandler('open-failed', () => {
      setIsLoading(false);
      onImageLoadError(
        'Could not load image.',
      );
    });
  }, [
    images,
    canvasWidth,
    onViewerReady,
    onImageLoadError,
  ]);

  useEffect(() => {
    if (!osdViewerRef.current) return;

    // The region to draw comes from the selected annotation, or—when nothing is
    // selected—from a region shared via a Content State link.
    const targets =
      selectedAnnotation?.target ?? (regionTarget ? [regionTarget] : null);
    if (!targets || targets.length === 0) return;

    const viewer = osdViewerRef.current;
    viewer.clearOverlays();

    const overlayRects: OpenSeadragon.Rect[] = [];

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
          const rawSvgData = decodeURIComponent(target.split('#svg=')[1]);

          try {
            const svgData = sanitizeSvg(rawSvgData, {
              maxLength: 200_000,
              disallowedTags: ['script', 'iframe', 'foreignObject'],
            });

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

              // Ensure viewBox matches image dimensions if missing
              if (!svgElem.hasAttribute('viewBox')) {
                svgElem.setAttribute(
                  'viewBox',
                  `0 0 ${canvasWidth} ${canvasHeight}`,
                );
              }

              // Apply fallback styling to *all* polygons and paths
              const shapes = svgElem.querySelectorAll('polygon, path');
              shapes.forEach((shape) => {
                if (!shape.getAttribute('stroke'))
                  shape.setAttribute('stroke', 'red');
                if (!shape.getAttribute('stroke-width'))
                  shape.setAttribute('stroke-width', '2');
                if (!shape.getAttribute('fill'))
                  shape.setAttribute('fill', 'rgba(255, 0, 0, 0.2)');
              });

              // Add the SVG to the overlay div
              overlayDiv.appendChild(svgElem);

              // Map overlay to full image coordinates
              const viewportRect = viewer.viewport.imageToViewportRectangle(
                0,
                0,
                canvasWidth,
                canvasHeight,
              );
              viewer.addOverlay({
                element: overlayDiv,
                location: viewportRect,
              });

              // The SVG overlay always covers the whole canvas, so it can't be
              // used to zoom to the annotation. Measure the tight pixel bounds
              // of the actual geometry and feed that into the shared fitBounds
              // path below, so selecting a GeoJSON/SVG annotation navigates to
              // it just like an #xywh= region (important for small features on
              // large georeferenced maps).
              const bounds = computeSvgPixelBounds(svgElem);
              if (bounds) {
                // Pad with surrounding context so tiny features aren't
                // over-zoomed: at least 100% of the feature size, and never
                // less than 2% of the canvas width.
                const padX = Math.max(bounds.width, canvasWidth * 0.02);
                const padY = Math.max(bounds.height, canvasWidth * 0.02);
                overlayRects.push(
                  viewer.viewport.imageToViewportRectangle(
                    bounds.minX - padX,
                    bounds.minY - padY,
                    bounds.width + padX * 2,
                    bounds.height + padY * 2,
                  ),
                );
              }
            }
          } catch (err) {
            logger.warn('Skipped unsafe SVG annotation:', err);
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
  }, [selectedAnnotation, regionTarget, canvasWidth, canvasHeight]);

  return (
    <div
      className="w-full h-full relative"
      role="region"
      aria-label="Image viewer"
      aria-busy={isLoading}
    >
      {isLoading && <SplashScreen />}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isLoading ? 'Loading image…' : ''}
      </div>
      <div
        ref={viewerRef}
        className="w-full h-full"
  id="iiif-viewer"
        tabIndex={0}
        aria-label="Zoomable image viewer"
      ></div>
    </div>
  );
};

export default IIIFViewer;
