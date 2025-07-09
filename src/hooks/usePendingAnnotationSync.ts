import { useEffect } from 'react';
import { IIIFAnnotation } from '../types/index.ts';

export function usePendingAnnotationSync(
  annotations: IIIFAnnotation[],
  pendingAnnotationId: string | null,
  viewerReady: boolean,
  setSelectedAnnotation: (anno: IIIFAnnotation | null) => void,
  setPendingAnnotationId: (id: string | null) => void,
  setViewerReady: (ready: boolean) => void
) {
  useEffect(() => {
    if (!pendingAnnotationId || annotations.length === 0 || !viewerReady) return;
    const match = annotations.find((anno) => anno.id === pendingAnnotationId);
    if (match) {
      setSelectedAnnotation(match);
      setPendingAnnotationId(null);
      setViewerReady(false);
    } else {
      console.warn('❌ Could not find annotation for ID:', pendingAnnotationId);
    }
  }, [annotations, pendingAnnotationId, viewerReady]);
}
