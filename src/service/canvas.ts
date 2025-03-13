import { IIIFCanvas, IIIFManifest } from '../types/index.ts';
import { TamerlaneParseError } from '../errors/index.ts';

export function getCanvasDimensions(
  manifest: IIIFManifest,
  canvasId: string,
): IIIFCanvas {
  const canvas = manifest.canvases.find((c) => c.id === canvasId);
  if (!canvas) {
    throw new TamerlaneParseError(`Canvas with ID ${canvasId} not found.`);
  }
  return {
    id: canvasId,
    canvasWidth: canvas.canvasWidth ?? 1000,
    canvasHeight: canvas.canvasHeight ?? 1000,
  };
}
