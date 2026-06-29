import { Maniiifest } from 'maniiifest';
import { GeoPoint, PointTransform, identityTransform } from './geojson.ts';
import { logger } from '../utils/logger.ts';

/**
 * Canvas-level georeferencing support (issue #59).
 *
 * Ground Control Points (GCPs) pair a resource coordinate (image pixel) with a
 * geographic coordinate. They are read from an embedded IIIF Georeference
 * Extension annotation (motivation `georeferencing`) on the canvas, then used to
 * build a geo -> resource transform via `@allmaps/transform`.
 *
 * `@allmaps/transform` is an ESM-only package, so it is imported lazily (and only
 * when GCPs are actually present) to keep it out of the synchronous module graph
 * and the test toolchain.
 */

export interface Gcp {
  resource: GeoPoint;
  geo: GeoPoint;
}

/** Minimum GCPs required to fit a (first order polynomial) transform. */
const MIN_GCPS = 3;

/**
 * Extracts georeference Ground Control Points from a canvas's embedded
 * georeferencing annotations. Returns null when fewer than three usable points
 * are found.
 */
export function extractCanvasGcps(canvas: any): Gcp[] | null {
  const gcps: Gcp[] = [];
  const pages = Array.isArray(canvas?.annotations) ? canvas.annotations : [];

  for (const page of pages) {
    const items = Array.isArray(page?.items) ? page.items : [];
    for (const anno of items) {
      const motivations = Array.isArray(anno?.motivation)
        ? anno.motivation
        : [anno?.motivation];
      if (!motivations.includes('georeferencing')) continue;

      // maniiifest exposes the Ground Control Points as the GeoJSON features of
      // the annotation's FeatureCollection body. Each feature pairs a resource
      // (pixel) coordinate in `properties.resourceCoords` with a geographic
      // coordinate in `geometry.coordinates`.
      let features: any[] = [];
      try {
        features = Array.from(Maniiifest.parseAnnotation(anno).iterateAnnotationFeature());
      } catch (err) {
        logger.warn('Could not parse georeferencing annotation; skipping.', err);
        continue;
      }

      for (const feature of features) {
        const resourceCoords = feature?.properties?.resourceCoords;
        const geoCoords = feature?.geometry?.coordinates;
        if (
          Array.isArray(resourceCoords) &&
          resourceCoords.length >= 2 &&
          Array.isArray(geoCoords) &&
          geoCoords.length >= 2
        ) {
          gcps.push({
            resource: [resourceCoords[0], resourceCoords[1]],
            geo: [geoCoords[0], geoCoords[1]],
          });
        }
      }
    }
  }

  return gcps.length >= MIN_GCPS ? gcps : null;
}

/**
 * Builds a geo -> resource point transform from GCPs using `@allmaps/transform`.
 * Falls back to the identity transform if the library cannot be loaded or the
 * transformer cannot be constructed.
 */
export async function createGeoToResourceTransform(
  gcps: Gcp[],
): Promise<PointTransform> {
  try {
    const { GcpTransformer } = await import('@allmaps/transform');
    const transformer = new GcpTransformer(gcps as any);
    return (point: GeoPoint) =>
      transformer.transformToResource(point as any) as GeoPoint;
  } catch (err) {
    logger.warn('Could not build georeference transform; using identity.', err);
    return identityTransform;
  }
}
