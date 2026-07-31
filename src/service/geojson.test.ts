import {
  geometriesToSvg,
  flattenLabel,
  toGeoJsonBodyFeature,
} from './geojson';

const CANVAS = 'https://example.org/canvas/1';

const polygonFeature = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ],
  },
  properties: { source: 'extract' },
};

describe('geometriesToSvg', () => {
  it('renders a Polygon and drops the duplicate closing point', () => {
    const svg = geometriesToSvg([polygonFeature.geometry]);
    expect(svg).toContain('<polygon');
    // 5 input coords -> 4 rendered points (closing duplicate removed)
    expect(svg).toContain('points="0,0 10,0 10,10 0,10"');
  });

  it('renders a LineString as a polyline', () => {
    const svg = geometriesToSvg([
      { type: 'LineString', coordinates: [[0, 0], [5, 5]] },
    ]);
    expect(svg).toContain('<polyline');
    expect(svg).toContain('fill="none"');
  });

  it('renders a Point as a circle', () => {
    const svg = geometriesToSvg([{ type: 'Point', coordinates: [3, 4] }]);
    expect(svg).toContain('<circle');
    expect(svg).toContain('cx="3"');
    expect(svg).toContain('cy="4"');
  });

  it('applies the supplied point transform', () => {
    const scale: PointTransform = ([x, y]) => [x * 2, y * 3];
    const svg = geometriesToSvg(
      [{ type: 'Point', coordinates: [3, 4] }],
      scale,
    );
    expect(svg).toContain('cx="6"');
    expect(svg).toContain('cy="12"');
  });

  it('returns null when there is no renderable geometry', () => {
    expect(geometriesToSvg([])).toBeNull();
  });
});

describe('flattenLabel', () => {
  it('returns a plain string label unchanged', () => {
    expect(flattenLabel('Hello')).toBe('Hello');
  });

  it('flattens an IIIF language map to the first value', () => {
    expect(flattenLabel({ en: ['Targeted Map'] })).toBe('Targeted Map');
  });

  it('flattens an array of strings', () => {
    expect(flattenLabel(['First', 'Second'])).toBe('First');
  });

  it('returns undefined for empty or missing labels', () => {
    expect(flattenLabel(undefined)).toBeUndefined();
    expect(flattenLabel({})).toBeUndefined();
    expect(flattenLabel('   ')).toBeUndefined();
  });
});

describe('toGeoJsonBodyFeature', () => {
  it('normalizes a GeoJSON Feature body with a language-map label', () => {
    const feature = {
      type: 'Feature',
      properties: { label: { en: ['Targeted Map'] } },
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
    };
    expect(toGeoJsonBodyFeature(feature)).toEqual({
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
      label: 'Targeted Map',
      properties: { label: { en: ['Targeted Map'] } },
    });
  });

  it('returns null when the feature has no usable geometry', () => {
    expect(toGeoJsonBodyFeature({ type: 'Feature', properties: {} })).toBeNull();
    expect(toGeoJsonBodyFeature(null)).toBeNull();
  });
});
