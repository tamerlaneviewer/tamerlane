import { computeSvgPixelBounds } from './svgBounds';

/**
 * Build an <svg> element from markup the same way IIIFViewer does at runtime
 * (assigning innerHTML and querying for the <svg>). Uses jsdom (react-scripts
 * default test environment).
 */
function makeSvg(inner: string): SVGElement {
  const div = document.createElement('div');
  div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`.trim();
  const svg = div.querySelector('svg');
  if (!svg) throw new Error('failed to build svg for test');
  return svg as unknown as SVGElement;
}

describe('computeSvgPixelBounds', () => {
  it('computes the tight bounds of a polygon', () => {
    const svg = makeSvg('<polygon points="10,20 40,20 40,60 10,60" />');
    expect(computeSvgPixelBounds(svg)).toEqual({
      minX: 10,
      minY: 20,
      width: 30,
      height: 40,
    });
  });

  it('computes the bounds of a polyline', () => {
    const svg = makeSvg('<polyline points="5,5 15,25 25,10" />');
    expect(computeSvgPixelBounds(svg)).toEqual({
      minX: 5,
      minY: 5,
      width: 20,
      height: 20,
    });
  });

  it('expands a circle to its radius extent', () => {
    const svg = makeSvg('<circle cx="100" cy="200" r="5" />');
    expect(computeSvgPixelBounds(svg)).toEqual({
      minX: 95,
      minY: 195,
      width: 10,
      height: 10,
    });
  });

  it('unions the bounds across multiple shapes', () => {
    const svg = makeSvg(
      '<polygon points="10,10 20,10 20,20 10,20" /><circle cx="100" cy="100" r="2" />',
    );
    expect(computeSvgPixelBounds(svg)).toEqual({
      minX: 10,
      minY: 10,
      width: 92, // 102 - 10
      height: 92,
    });
  });

  it('returns null when there is no renderable geometry', () => {
    expect(computeSvgPixelBounds(makeSvg(''))).toBeNull();
  });

  it('ignores shapes with unparseable points and uses the valid geometry', () => {
    const svg = makeSvg(
      '<polygon points="foo bar" /><circle cx="50" cy="50" r="0" />',
    );
    expect(computeSvgPixelBounds(svg)).toEqual({
      minX: 50,
      minY: 50,
      width: 0,
      height: 0,
    });
  });
});
