import { searchAnnotations } from '../service/search.ts';
import { parseResource } from '../service/parser.ts';
import { IIIFManifest } from '../types/index.ts';

interface UseSearchLogicProps {
  currentManifest: IIIFManifest | null;
  manifestUrls: string[];
  totalManifests: number;
  selectedManifestIndex: number;
  setSelectedManifestIndex: (n: number) => void;
  setSelectedImageIndex: (n: number) => void;
  setCurrentManifest: (m: IIIFManifest | null) => void;
  setCanvasId: (id: string) => void;
  setViewerReady: (r: boolean) => void;
  setPendingAnnotationId: (id: string | null) => void;
  setActivePanelTab: (tab: 'annotations' | 'searchResults') => void;
  setSelectedSearchResultId: (id: string | null) => void;
  setError: (msg: string) => void;
  setSearchResults: (results: any[]) => void;
  setSearching: (b: boolean) => void;
  searchUrl: string;
  handleManifestUpdate: (
    manifest: IIIFManifest,
    manifestUrls: string[],
    total: number,
    collection: any
  ) => void;
}

export function useSearchLogic({
  currentManifest,
  manifestUrls,
  totalManifests,
  selectedManifestIndex,
  setSelectedManifestIndex,
  setSelectedImageIndex,
  setCurrentManifest,
  setCanvasId,
  setViewerReady,
  setPendingAnnotationId,
  setActivePanelTab,
  setSelectedSearchResultId,
  setError,
  setSearchResults,
  setSearching,
  searchUrl,
  handleManifestUpdate,
}: UseSearchLogicProps) {
  const handleSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (!searchUrl) {
      setError('This resource does not support content search.');
      return;
    }

    try {
      setSearching(true);
      const searchEndpoint = `${searchUrl}?q=${encodeURIComponent(trimmed)}`;
      const results = await searchAnnotations(searchEndpoint);
      setSearchResults(results);
      setActivePanelTab('searchResults');
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSearchResultClick = async (
    canvasTarget: string,
    manifestId?: string,
    searchResultId?: string
  ) => {
    try {
      if (searchResultId) setSelectedSearchResultId(searchResultId);
      let targetManifest = currentManifest;

      if (
        manifestId &&
        !manifestUrls[selectedManifestIndex]?.includes(manifestId)
      ) {
        const matchedIndex = manifestUrls.findIndex((url) =>
          url.includes(manifestId)
        );
        if (matchedIndex === -1) return setError('Manifest not found.');

        const { firstManifest, collection } = await parseResource(
          manifestUrls[matchedIndex]
        );
        if (!firstManifest) return setError('Failed to load manifest.');

        setSelectedManifestIndex(matchedIndex);
        setSelectedImageIndex(0);
        setCurrentManifest(firstManifest);
        handleManifestUpdate(
          firstManifest,
          manifestUrls,
          totalManifests,
          collection
        );
        targetManifest = firstManifest;
      }

      const baseCanvasTarget = canvasTarget.split('#')[0];
      const newImageIndex =
        targetManifest?.images?.findIndex(
          (img) => img.canvasTarget === baseCanvasTarget
        ) ?? -1;

      if (newImageIndex === -1) return setError('Canvas not found.');

      setViewerReady(false);
      setSelectedImageIndex(newImageIndex);
      setCanvasId(canvasTarget);
      setActivePanelTab('annotations');
      if (searchResultId) setPendingAnnotationId(searchResultId);
    } catch (err) {
      console.error('Failed to jump to search result:', err);
      setError('Could not jump to search result.');
    }
  };

  return { handleSearch, handleSearchResultClick };
}
