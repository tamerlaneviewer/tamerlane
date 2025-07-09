import { IIIFManifest, IIIFCollection } from '../types/index.ts';

export function handleManifestUpdate(
  firstManifest: IIIFManifest | null,
  manifestUrls: string[],
  total: number,
  collection: IIIFCollection | null,
  setCurrentManifest: (m: IIIFManifest | null) => void,
  setManifestUrls: (urls: string[]) => void,
  setTotalManifests: (n: number) => void,
  setManifestMetadata: (meta: any) => void,
  setCurrentCollection: (c: IIIFCollection | null) => void,
  setCollectionMetadata: (meta: any) => void,
  setAutocompleteUrl: (url: string) => void,
  setSearchUrl: (url: string) => void
) {
  setCurrentManifest(firstManifest);
  setManifestUrls(manifestUrls);
  setTotalManifests(total);
  setManifestMetadata({
    label: firstManifest?.info?.name || '',
    metadata: firstManifest?.info?.metadata || [],
    provider: firstManifest?.info?.provider || [],
    homepage: firstManifest?.info?.homepage || [],
    requiredStatement: firstManifest?.info?.requiredStatement,
  });

  if (collection) {
    setCurrentCollection(collection);
    setCollectionMetadata({
      label: collection.info.name || '',
      metadata: collection.info.metadata || [],
      provider: collection.info.provider || [],
      homepage: collection.info.homepage || [],
      requiredStatement: collection.info.requiredStatement,
    });
  }

  const effectiveCollection = collection ?? null;
  setAutocompleteUrl(
    effectiveCollection?.collectionSearch?.autocomplete ??
    firstManifest?.manifestSearch?.autocomplete ?? ''
  );
  setSearchUrl(
    effectiveCollection?.collectionSearch?.service ??
    firstManifest?.manifestSearch?.service ?? ''
  );
}
