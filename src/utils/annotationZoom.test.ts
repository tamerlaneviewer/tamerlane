import {
  computeAnnotationZoomTarget,
  unionPixelRects,
  MAX_ZOOM_MULTIPLIER,
} from './annotationZoom';

describe('computeAnnotationZoomTarget', () => {
  const CANVAS_W = 4000;
  const CANVAS_H = 3000;

  it('expands a normally-proportioned target and keeps its centre', () => {
    const bounds = { minX: 1000, minY: 1000, width: 400, height: 300 };
    const { fitRect, center } = computeAnnotationZoomTarget(bounds, CANVAS_W, CANVAS_H);

    expect(center).toEqual({ x: 1200, y: 1150 });
    // Expanded by 40%: 400*1.4 = 560, 300*1.4 = 420 (both above the min coverage floor).
    expect(fitRect.width).toBeCloseTo(560);
    expect(fitRect.height).toBeCloseTo(420);
    // Still centred on the original annotation.
    expect(fitRect.minX + fitRect.width / 2).toBeCloseTo(center.x);
    expect(fitRect.minY + fitRect.height / 2).toBeCloseTo(center.y);
  });

  it('never lets a dimension collapse below the minimum canvas coverage', () => {
    const bounds = { minX: 500, minY: 500, width: 20, height: 20 };
    const { fitRect } = computeAnnotationZoomTarget(bounds, CANVAS_W, CANVAS_H);

    expect(fitRect.width).toBeGreaterThanOrEqual(CANVAS_W * 0.06);
    expect(fitRect.height).toBeGreaterThanOrEqual(CANVAS_H * 0.06);
  });

  it('gives a thin horizontal target (a line of text) extra vertical context', () => {
    // Long, thin target: a single line of newspaper text.
    const bounds = { minX: 200, minY: 900, width: 1200, height: 40 };
    const { fitRect } = computeAnnotationZoomTarget(bounds, CANVAS_W, CANVAS_H);

    // Height should be boosted well beyond the plain 40% expansion (56px).
    expect(fitRect.height).toBeGreaterThanOrEqual(CANVAS_H * 0.1);
    // Width should still just be the standard expansion.
    expect(fitRect.width).toBeCloseTo(1200 * 1.4);
  });

  it('gives a thin vertical target extra horizontal context', () => {
    const bounds = { minX: 900, minY: 200, width: 30, height: 1000 };
    const { fitRect } = computeAnnotationZoomTarget(bounds, CANVAS_W, CANVAS_H);

    expect(fitRect.width).toBeGreaterThanOrEqual(CANVAS_W * 0.1);
    expect(fitRect.height).toBeCloseTo(1000 * 1.4);
  });

  it('keeps the reported centre equal to the original annotation centre even when clamped', () => {
    const bounds = { minX: 0, minY: 0, width: 4, height: 4 };
    const { center } = computeAnnotationZoomTarget(bounds, CANVAS_W, CANVAS_H);
    expect(center).toEqual({ x: 2, y: 2 });
  });
});

describe('unionPixelRects', () => {
  it('unions two overlapping rects', () => {
    const a = { minX: 0, minY: 0, width: 10, height: 10 };
    const b = { minX: 5, minY: 5, width: 10, height: 10 };
    expect(unionPixelRects(a, b)).toEqual({ minX: 0, minY: 0, width: 15, height: 15 });
  });

  it('unions two disjoint rects', () => {
    const a = { minX: 0, minY: 0, width: 5, height: 5 };
    const b = { minX: 100, minY: 200, width: 10, height: 10 };
    expect(unionPixelRects(a, b)).toEqual({ minX: 0, minY: 0, width: 110, height: 210 });
  });
});

describe('MAX_ZOOM_MULTIPLIER', () => {
  it('is within the recommended 5-8x range', () => {
    expect(MAX_ZOOM_MULTIPLIER).toBeGreaterThanOrEqual(5);
    expect(MAX_ZOOM_MULTIPLIER).toBeLessThanOrEqual(8);
  });
});
