import { getCanvasDimensions } from './canvas';
import { IIIFManifest } from '../types';

describe('getCanvasDimensions', () => {
  test('extracts canvas dimensions correctly', () => {
    const mockManifest: IIIFManifest = {
      info: { name: 'Test Manifest' },
      canvases: [
        {
          id: 'canvas1',
          canvasWidth: 1200,
          canvasHeight: 800
        }
      ],
      images: []
    };
    
    const result = getCanvasDimensions(mockManifest, 'canvas1');
    expect(result.canvasWidth).toBe(1200);
    expect(result.canvasHeight).toBe(800);
  });

  test('handles missing canvas gracefully', () => {
    const mockManifest: IIIFManifest = {
      info: { name: 'Test Manifest' },
      canvases: [
        {
          id: 'canvas1',
          canvasWidth: 1200,
          canvasHeight: 800
        }
      ],
      images: []
    };
    
    expect(() => {
      getCanvasDimensions(mockManifest, 'nonexistent-canvas');
    }).toThrow();
  });

  test('handles manifest without canvases', () => {
    const mockManifest: IIIFManifest = {
      info: { name: 'Test Manifest' },
      canvases: [],
      images: []
    };
    
    expect(() => {
      getCanvasDimensions(mockManifest, 'canvas1');
    }).toThrow();
  });

  test('handles canvas with missing dimensions', () => {
    const mockManifest: IIIFManifest = {
      info: { name: 'Test Manifest' },
      canvases: [{ id: 'canvas1' }], // No width/height
      images: []
    };
    
    const result = getCanvasDimensions(mockManifest, 'canvas1');
    expect(result.canvasWidth).toBe(1000); // Default value
    expect(result.canvasHeight).toBe(1000); // Default value
  });

  test('finds canvas among multiple canvases', () => {
    const mockManifest: IIIFManifest = {
      info: { name: 'Test Manifest' },
      canvases: [
        { id: 'canvas1', canvasWidth: 800, canvasHeight: 600 },
        { id: 'canvas2', canvasWidth: 1200, canvasHeight: 900 },
        { id: 'canvas3', canvasWidth: 1600, canvasHeight: 1200 }
      ],
      images: []
    };
    
    const result = getCanvasDimensions(mockManifest, 'canvas2');
    expect(result.canvasWidth).toBe(1200);
    expect(result.canvasHeight).toBe(900);
  });

  test('handles canvas with partial dimensions', () => {
    const mockManifest: IIIFManifest = {
      info: { name: 'Test Manifest' },
      canvases: [
        { id: 'canvas1', canvasWidth: 1200 } // Only width, no height
      ],
      images: []
    };
    
    const result = getCanvasDimensions(mockManifest, 'canvas1');
    expect(result.canvasWidth).toBe(1200);
    expect(result.canvasHeight).toBe(1000); // Default value for missing height
  });
});
