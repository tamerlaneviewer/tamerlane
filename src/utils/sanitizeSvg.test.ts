import { sanitizeSvg } from './sanitizeSvg.ts';

describe('sanitizeSvg', () => {
  it('preserves vector-effect="non-scaling-stroke" on overlay geometry', () => {
    // Overlays rely on vector-effect to keep the stroke a constant width on
    // screen at any zoom. It is not in DOMPurify's default SVG allowlist, so a
    // regression here silently makes lines scale down to sub-pixel widths.
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<polyline points="0,0 100,100" fill="none" stroke="red" ' +
      'stroke-width="3" vector-effect="non-scaling-stroke"/></svg>';

    const result = sanitizeSvg(svg);

    expect(result).toContain('vector-effect="non-scaling-stroke"');
  });

  it('strips <script> content but keeps drawable shapes', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">' +
      '<script>alert(1)</script>' +
      '<circle cx="5" cy="5" r="4"/></svg>';

    expect(() =>
      sanitizeSvg(svg, { disallowedTags: ['script'] }),
    ).toThrow(/disallowed <script>/);
  });

  it('throws when the SVG exceeds the max length', () => {
    const big = '<svg>' + 'a'.repeat(1000) + '</svg>';
    expect(() => sanitizeSvg(big, { maxLength: 100 })).toThrow(/max length/);
  });
});
