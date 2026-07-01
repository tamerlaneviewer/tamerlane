import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GeoJsonBodyFeature } from '../types/index.ts';
import { basemapConfig } from '../config/appConfig.ts';
import { logger } from '../utils/logger.ts';

interface GeoJsonMapProps {
  features: GeoJsonBodyFeature[];
  className?: string;
}

/**
 * Renders GeoJSON geometries from an annotation body on an OpenStreetMap
 * basemap (issue #59 / IIIF Cookbook recipe 0139). The geometry is in
 * geographic (lon/lat) space, so it is shown on a map rather than on the IIIF
 * image. Points are drawn as circle markers to avoid Leaflet's default marker
 * icon assets.
 */
const GeoJsonMap: React.FC<GeoJsonMapProps> = ({ features, className }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !features || features.length === 0) return;

    let map: L.Map | null = null;
    let raf = 0;

    try {
      map = L.map(container, {
        attributionControl: true,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer(basemapConfig.tileUrl, {
        maxZoom: basemapConfig.maxZoom,
        attribution: basemapConfig.attribution,
      }).addTo(map);

      const collection = {
        type: 'FeatureCollection',
        features: features
          .filter((f) => f.geometry && typeof f.geometry.type === 'string')
          .map((f) => ({
            type: 'Feature',
            properties: f.properties ?? {},
            geometry: f.geometry,
          })),
      };

      const layer = L.geoJSON(collection as any, {
        style: {
          color: '#dc2626',
          weight: 2,
          fillColor: '#ef4444',
          fillOpacity: 0.2,
        },
        pointToLayer: (_feature, latlng) =>
          L.circleMarker(latlng, {
            radius: 6,
            color: '#dc2626',
            fillColor: '#ef4444',
            fillOpacity: 0.6,
            weight: 2,
          }),
        onEachFeature: (feature, lyr) => {
          const label = feature?.properties?.label;
          if (typeof label === 'string' && label.trim()) {
            // Bind the label as plain text: Leaflet treats a string popup as
            // HTML, so a malicious manifest label could otherwise inject markup.
            // Using textContent neutralizes any HTML in untrusted manifest data.
            const popupEl = document.createElement('div');
            popupEl.textContent = label;
            lyr.bindPopup(popupEl);
          }
        },
      }).addTo(map);

      const bounds = layer.getBounds();
      const fit = () => {
        if (bounds.isValid()) {
          map?.fitBounds(bounds, { padding: [16, 16], maxZoom: 14 });
        } else {
          map?.setView([0, 0], 1);
        }
      };
      fit();

      // The annotation panel can mount the map before its container has its
      // final size; recompute once layout settles so tiles and bounds render.
      raf = requestAnimationFrame(() => {
        map?.invalidateSize();
        fit();
      });
    } catch (err) {
      logger.warn('Could not render GeoJSON basemap.', err);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      map?.remove();
    };
  }, [features]);

  return (
    <div
      ref={containerRef}
      className={
        className ??
        'mt-1 h-40 w-full rounded border border-gray-200 overflow-hidden'
      }
      role="img"
      aria-label="Map showing the geographic location of this annotation"
    />
  );
};

export default GeoJsonMap;
