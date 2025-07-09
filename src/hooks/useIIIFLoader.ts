import { useEffect } from 'react';
import { parseResource } from '../service/parser.ts';
import { IIIFManifest, IIIFCollection } from '../types/index.ts';

export function useIIIFLoader(
  iiifContentUrl: string | null,
  handleManifestUpdate: (
    firstManifest: IIIFManifest | null,
    manifestUrls: string[],
    total: number,
    collection: IIIFCollection | null
  ) => void,
  setError: (error: string) => void
) {
  useEffect(() => {
    if (!iiifContentUrl) return;

    parseResource(iiifContentUrl)
      .then(({ firstManifest, manifestUrls, total, collection }) => {
        handleManifestUpdate(firstManifest, manifestUrls, total, collection ?? null);
      })
      .catch(() => {
        setError('Failed to load IIIF content. Please check the URL.');
      });
  }, [iiifContentUrl]);
}
