/**
 * Shared logic for deciding how far to zoom in on a selected annotation
 * target. Works purely in image-pixel space so it has no dependency on
 * OpenSeadragon and can be unit tested in isolation; the viewer is
 * responsible for converting the result to viewport coordinates, fitting it,
 * and clamping/centering the final zoom (see `MAX_ZOOM_MULTIPLIER`).
 *
 * The annotation target determines the *centre* of attention, but the
 * viewport bounds we actually fit to are expanded beyond the raw target so
 * that small features (a line of text, a thin road on a map, a single word)
 * aren't blown up to fill the whole screen. This keeps zooming sensible
 * across books, newspapers and maps without needing annotation-specific
 * metadata.
 */

export interface PixelRect {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface AnnotationZoomTarget {
  /** The (expanded) bounds to fit in the viewport. */
  fitRect: PixelRect;
  /** The true centre of the original annotation target, to zoom/pan around. */
  center: { x: number; y: number };
}

/** Grow the annotation bounds by this fraction before fitting. */
const EXPAND_RATIO = 0.4;
/** The fitted bounds should span at least this fraction of the canvas per dimension. */
const MIN_COVERAGE_RATIO = 0.06;
/** ...rising to this fraction on the short axis of very thin targets (e.g. a line of text). */
const THIN_MIN_COVERAGE_RATIO = 0.1;
/** long:short ratio beyond which a target is considered "thin". */
const THIN_ASPECT_THRESHOLD = 4;
/** Never zoom in further than this multiple of the home (fit-to-canvas) zoom. */
export const MAX_ZOOM_MULTIPLIER = 6;

/** Union two axis-aligned pixel rectangles. */
export function unionPixelRects(a: PixelRect, b: PixelRect): PixelRect {
  const minX = Math.min(a.minX, b.minX);
  const minY = Math.min(a.minY, b.minY);
  const maxX = Math.max(a.minX + a.width, b.minX + b.width);
  const maxY = Math.max(a.minY + a.height, b.minY + b.height);
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Compute the bounds to fit in the viewport and the true centre point for a
 * selected annotation target, given the bounds of that target and the size
 * of the canvas it sits on (all in image-pixel space).
 */
export function computeAnnotationZoomTarget(
  bounds: PixelRect,
  canvasWidth: number,
  canvasHeight: number,
): AnnotationZoomTarget {
  const centerX = bounds.minX + bounds.width / 2;
  const centerY = bounds.minY + bounds.height / 2;

  // Expand by a fixed ratio around the original centre.
  let width = bounds.width * (1 + EXPAND_RATIO);
  let height = bounds.height * (1 + EXPAND_RATIO);

  // Never let either dimension collapse below a fraction of the canvas -
  // otherwise a single word or thin line fills the whole viewport.
  width = Math.max(width, canvasWidth * MIN_COVERAGE_RATIO);
  height = Math.max(height, canvasHeight * MIN_COVERAGE_RATIO);

  // Give thin targets (a line of text, a thin road on a map) extra
  // breathing room on their short axis so they aren't rendered edge-to-edge.
  const long = Math.max(bounds.width, bounds.height);
  const short = Math.max(Math.min(bounds.width, bounds.height), 1e-6);
  if (long / short > THIN_ASPECT_THRESHOLD) {
    if (bounds.width >= bounds.height) {
      height = Math.max(height, canvasHeight * THIN_MIN_COVERAGE_RATIO);
    } else {
      width = Math.max(width, canvasWidth * THIN_MIN_COVERAGE_RATIO);
    }
  }

  return {
    fitRect: {
      minX: centerX - width / 2,
      minY: centerY - height / 2,
      width,
      height,
    },
    center: { x: centerX, y: centerY },
  };
}
