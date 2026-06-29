/**
 * Support for GeoJSON `Feature` annotation targets on IIIF canvases (issue #59).
 *
 * IIIF annotations may carry a GeoJSON geometry in their `target` (a `Feature`
 * or `FeatureCollection`) instead of a normal canvas fragment. maniiifest parses
 * these targets natively, so this module only handles rendering: it converts the
 * target geometries to an SVG overlay (in resource / pixel space) and emits a
 * standard `<canvas>#svg=<encoded>` target that the existing viewer overlay code
 * already knows how to render.
 *
 * Geographic coordinates are mapped into image (resource) space with an
 * injectable point transform. When canvas-level georeference control points are
 * available the transform is built with `@allmaps/transform`; otherwise an
 * identity transform is used and the coordinates are assumed to already be in
 * resource/pixel space.
 */

export type GeoPoint = [number, number];

/** Maps a coordinate from geo space to resource (image pixel) space. */
export type PointTransform = (point: GeoPoint) => GeoPoint;

/** Default transform used when no georeference information is available. */
export const identityTransform: PointTransform = (point) => point;

export interface GeoJsonGeometry {
  type: string;
  coordinates: any;
}

/** A GeoJSON Feature, as yielded by maniiifest's target iterators. */
export interface GeoJsonFeature {
  geometry?: { type?: string; coordinates?: any } | null;
}

function round(n: number): number {
  return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : 0;
}

function pointString(p: GeoPoint): string {
  return `${round(p[0])},${round(p[1])}`;
}

function ringToPolygon(coords: GeoPoint[], transform: PointTransform): string {
  // GeoJSON linear rings repeat the first coordinate as the last; drop the
  // duplicate closing point because <polygon> closes the path implicitly.
  const closed =
    coords.length > 1 &&
    coords[0][0] === coords[coords.length - 1][0] &&
    coords[0][1] === coords[coords.length - 1][1];
  const ring = closed ? coords.slice(0, -1) : coords;
  const points = ring.map((c) => pointString(transform(c))).join(' ');
  return `<polygon points="${points}" fill="rgba(255,0,0,0.2)" stroke="red" stroke-width="2"/>`;
}

function lineToPolyline(coords: GeoPoint[], transform: PointTransform): string {
  const points = coords.map((c) => pointString(transform(c))).join(' ');
  return `<polyline points="${points}" fill="none" stroke="red" stroke-width="2"/>`;
}

function pointToCircle(coord: GeoPoint, transform: PointTransform): string {
  const p = transform(coord);
  return `<circle cx="${round(p[0])}" cy="${round(p[1])}" r="5" fill="rgba(255,0,0,0.4)" stroke="red" stroke-width="2"/>`;
}

function geometryToShapes(
  geometry: GeoJsonGeometry,
  transform: PointTransform,
): string[] {
  switch (geometry.type) {
    case 'Point':
      return [pointToCircle(geometry.coordinates as GeoPoint, transform)];
    case 'MultiPoint':
      return (geometry.coordinates as GeoPoint[]).map((c) =>
        pointToCircle(c, transform),
      );
    case 'LineString':
      return [lineToPolyline(geometry.coordinates as GeoPoint[], transform)];
    case 'MultiLineString':
      return (geometry.coordinates as GeoPoint[][]).map((line) =>
        lineToPolyline(line, transform),
      );
    case 'Polygon':
      return (geometry.coordinates as GeoPoint[][]).map((ring) =>
        ringToPolygon(ring, transform),
      );
    case 'MultiPolygon':
      return (geometry.coordinates as GeoPoint[][][]).flatMap((polygon) =>
        polygon.map((ring) => ringToPolygon(ring, transform)),
      );
    default:
      return [];
  }
}

/**
 * Builds an SVG string (in resource/pixel space) from one or more GeoJSON
 * geometries, applying the supplied point transform. Returns null when no
 * renderable geometry is present.
 */
export function geometriesToSvg(
  geometries: GeoJsonGeometry[],
  transform: PointTransform = identityTransform,
): string | null {
  const shapes: string[] = [];
  for (const geometry of geometries) {
    shapes.push(...geometryToShapes(geometry, transform));
  }
  if (shapes.length === 0) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg">${shapes.join('')}</svg>`;
}

/**
 * Builds a standard `<canvas>#svg=<encoded>` overlay target from the GeoJSON
 * features of an annotation target (as yielded by maniiifest's
 * `iterateAnnotationTargetFeature`). Geometries are transformed into resource /
 * pixel space first. Returns null when no renderable geometry is present.
 */
export function geoFeaturesToSvgTarget(
  features: GeoJsonFeature[],
  targetUrl: string,
  transform: PointTransform = identityTransform,
): string | null {
  const geometries = features
    .map((f) => f?.geometry)
    .filter((g): g is GeoJsonGeometry => !!g && typeof g.type === 'string');
  const svg = geometriesToSvg(geometries, transform);
  if (!svg) return null;
  return `${targetUrl}#svg=${encodeURIComponent(svg)}`;
}
