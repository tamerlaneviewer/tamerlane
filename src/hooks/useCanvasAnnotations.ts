import { useEffect } from 'react';
import { getAnnotationsForTarget } from '../service/annotation.ts';
import { IIIFManifest } from '../types/index.ts';

export function useCanvasAnnotations(
  currentManifest: IIIFManifest | null,
  canvasId: string,
  manifestUrls: string[],
  selectedManifestIndex: number,
  setAnnotations: (annos: any[]) => void,
  setError: (msg: string) => void
) {
  useEffect(() => {
    if (!currentManifest || !canvasId || manifestUrls.length === 0) return;
    const manifestUrl = manifestUrls[selectedManifestIndex];
    getAnnotationsForTarget(manifestUrl, canvasId)
      .then(setAnnotations)
      .catch((err) => {
        console.error('Error fetching annotations:', err);
        setAnnotations([]);
        setError('Unable to load annotations for this canvas.');
      });
  }, [currentManifest, canvasId, selectedManifestIndex, manifestUrls]);
}
