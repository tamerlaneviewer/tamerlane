import { normalizeAnnotationTargets } from './annotation';

describe('normalizeAnnotationTargets', () => {
  it('returns the string if target is a string', () => {
    expect(normalizeAnnotationTargets('canvas1')).toEqual(['canvas1']);
  });

  it('flattens arrays of strings', () => {
    expect(normalizeAnnotationTargets(['canvas1', 'canvas2'])).toEqual(['canvas1', 'canvas2']);
  });

  it('extracts id from object', () => {
    expect(normalizeAnnotationTargets({ id: 'canvas3' })).toEqual(['canvas3']);
  });

  it('extracts source and selector', () => {
    expect(
      normalizeAnnotationTargets({ source: 'canvas4', selector: { type: 'FragmentSelector', value: 'xywh=10,20,30,40' } })
    ).toEqual(['canvas4#xywh=10,20,30,40']);
  });

  it('extracts source from nested object', () => {
    expect(
      normalizeAnnotationTargets({ source: { id: 'canvas5' } })
    ).toEqual(['canvas5']);
  });

  it('extracts value if no id or source', () => {
    expect(normalizeAnnotationTargets({ value: 'canvas6' })).toEqual(['canvas6']);
  });

  it('handles deeply nested arrays', () => {
    expect(
      normalizeAnnotationTargets([
        'canvas7',
        [{ id: 'canvas8' }, { source: 'canvas9', selector: { value: 'xywh=1,2,3,4' } }],
      ])
    ).toEqual(['canvas7', 'canvas8', 'canvas9#xywh=1,2,3,4']);
  });
});