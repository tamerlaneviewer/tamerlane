import { useCallback } from 'react';
import { IIIFCollection, IIIFManifest } from '../types/index.ts';

interface MetadataEntry {
  label: any;
  value: any;
}

interface MetadataBlock {
  label: string;
  metadata: MetadataEntry[];
  provider: any[];
  homepage: any[];
  requiredStatement?: { label: any; value: any };
}

interface UseManifestControllerProps {
  setCurrentManifest: (m: IIIFManifest | null) => void;
  setManifestUrls: (urls: string[]) => void;
  setTotalManifests: (n: number) => void;
  setManifestMetadata: (data: MetadataBlock) => void;
  setCurrentCollection: (c: IIIFCollection | null) => void;
  setCollectionMetadata: (data: MetadataBlock) => void;
  setAutocompleteUrl: (url: string) => void;
  setSearchUrl: (url: string) => void;
  currentCollection: IIIFCollection | null;
}

export function useManifestController({
  setCurrentManifest,
  setManifestUrls,
  setTotalManifests,
  setManifestMetadata,
  setCurrentCollection,
  setCollectionMetadata,
  setAutocompleteUrl,
  setSearchUrl,
  currentCollection,
}: UseManifestControllerProps) {
  const handleManifestUpdate = useCallback((
    firstManifest: IIIFManifest | null,
    urls: string[],
    total: number,
    collection: IIIFCollection | null = null
  ) => {
    setCurrentManifest(firstManifest);
    setManifestUrls(urls);
    setTotalManifests(total);

    // Manifest metadata
    if (firstManifest) {
      setManifestMetadata({
        label: firstManifest.info?.name || '',
        metadata: firstManifest.info?.metadata || [],
        provider: firstManifest.info?.provider || [],
        homepage: firstManifest.info?.homepage || [],
        requiredStatement: firstManifest.info?.requiredStatement,
      });
    }

    // Determine collection (explicit > existing > null)
    const effectiveCollection = collection ?? currentCollection;

    if (collection) {
      setCurrentCollection(collection);
      setCollectionMetadata({
        label: collection.info?.name || '',
        metadata: collection.info?.metadata || [],
        provider: collection.info?.provider || [],
        homepage: collection.info?.homepage || [],
        requiredStatement: collection.info?.requiredStatement,
      });
    }

    // Search endpoints
    setAutocompleteUrl(
      effectiveCollection?.collectionSearch?.autocomplete ??
      firstManifest?.manifestSearch?.autocomplete ?? ''
    );

    setSearchUrl(
      effectiveCollection?.collectionSearch?.service ??
      firstManifest?.manifestSearch?.service ?? ''
    );
  }, [
    setCurrentManifest,
    setManifestUrls,
    setTotalManifests,
    setManifestMetadata,
    setCurrentCollection,
    setCollectionMetadata,
    setAutocompleteUrl,
    setSearchUrl,
    currentCollection
  ]);

  return { handleManifestUpdate };
}
