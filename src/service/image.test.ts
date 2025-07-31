import { getImage } from './image';
import { TamerlaneParseError } from '../errors/index.ts';
import { IIIFImage } from '../types/index.ts';

describe('getImage', () => {
  const CANVAS_TARGET = 'https://example.com/canvas/1';

  it('should extract a IIIF image with service.id', () => {
    const resource = {
      service: [
        {
          id: 'https://example.com/iiif/image',
          width: 1024,
          height: 768,
        },
      ],
      width: 2048, // Should be overridden by service dimensions
      height: 1536,
    };

    const expected: IIIFImage = {
      imageUrl: 'https://example.com/iiif/image',
      imageType: 'iiif',
      imageWidth: 1024,
      imageHeight: 768,
      canvasTarget: CANVAS_TARGET,
    };

    expect(getImage(resource, CANVAS_TARGET)).toEqual(expected);
  });

  it('should extract a IIIF image with service["@id"]', () => {
    const resource = {
      service: [
        {
          '@id': 'https://example.com/iiif/image_at_id',
          width: 800,
          height: 600,
        },
      ],
    };

    const expected: IIIFImage = {
      imageUrl: 'https://example.com/iiif/image_at_id',
      imageType: 'iiif',
      imageWidth: 800,
      imageHeight: 600,
      canvasTarget: CANVAS_TARGET,
    };

    expect(getImage(resource, CANVAS_TARGET)).toEqual(expected);
  });

  it('should fall back to resource dimensions if service dimensions are missing', () => {
    const resource = {
      service: [
        {
          id: 'https://example.com/iiif/image',
        },
      ],
      width: 1200,
      height: 900,
    };

    const result = getImage(resource, CANVAS_TARGET);
    expect(result.imageWidth).toBe(1200);
    expect(result.imageHeight).toBe(900);
  });

  it('should extract a standard image when no service is present', () => {
    const resource = {
      id: 'https://example.com/standard/image.jpg',
      width: 640,
      height: 480,
    };

    const expected: IIIFImage = {
      imageUrl: 'https://example.com/standard/image.jpg',
      imageType: 'standard',
      imageWidth: 640,
      imageHeight: 480,
      canvasTarget: CANVAS_TARGET,
    };

    expect(getImage(resource, CANVAS_TARGET)).toEqual(expected);
  });

  it('should handle a standard image without dimensions', () => {
    const resource = {
      id: 'https://example.com/standard/image.jpg',
    };

    const result = getImage(resource, CANVAS_TARGET);
    expect(result.imageUrl).toBe('https://example.com/standard/image.jpg');
    expect(result.imageType).toBe('standard');
    expect(result.imageWidth).toBeUndefined();
    expect(result.imageHeight).toBeUndefined();
  });

  it('should throw TamerlaneParseError if no URL can be found', () => {
    const resource = {
      width: 100,
      height: 100,
      // No id or service
    };

    expect(() => getImage(resource, CANVAS_TARGET)).toThrow(TamerlaneParseError);
    expect(() => getImage(resource, CANVAS_TARGET)).toThrow('Unable to get image resource id.');
  });

  it('should handle an empty service array gracefully', () => {
    const resource = {
      id: 'https://example.com/standard/image.jpg',
      width: 640,
      height: 480,
      service: [],
    };

    const result = getImage(resource, CANVAS_TARGET);
    expect(result.imageType).toBe('standard');
    expect(result.imageUrl).toBe('https://example.com/standard/image.jpg');
  });
});
