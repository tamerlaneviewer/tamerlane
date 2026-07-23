/**
 * Compute the tight bounding box (in image/pixel space) of the drawable
 * geometry inside an SVG overlay element. The SVG produced for GeoJSON targets
 * uses <polygon>/<polyline> `points` and <circle> cx/cy/r in resource
 * coordinates, so we can read those directly. Returns null when no coordinates
 * are found.
 */
export function computeSvgPixelBounds(
  svgElem: SVGElement,
): { minX: number; minY: number; width: number; height: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const consider = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  svgElem.querySelectorAll('polygon, polyline').forEach((shape) => {
    const raw = shape.getAttribute('points') ?? '';
    const nums = raw.trim().split(/[\s,]+/).map(Number).filter(Number.isFinite);
    for (let i = 0; i + 1 < nums.length; i += 2) consider(nums[i], nums[i + 1]);
  });

  svgElem.querySelectorAll('circle').forEach((shape) => {
    const cx = Number(shape.getAttribute('cx'));
    const cy = Number(shape.getAttribute('cy'));
    const r = Number(shape.getAttribute('r')) || 0;
    consider(cx - r, cy - r);
    consider(cx + r, cy + r);
  });

  if (minX === Infinity) return null;
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}
