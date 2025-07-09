// src/hooks/useManifestNavigator.ts
import { useCallback } from 'react';
import { parseResource } from '../service/parser.ts';
import { IIIFCollection, IIIFManifest, IIIFAnnotation } from '../types/index.ts';

interface UseManifestNavigatorProps {
    manifestUrls: string[];
    totalManifests: number;
    selectedManifestIndex: number;
    setSelectedManifestIndex: (n: number) => void;
    setSelectedImageIndex: (n: number) => void;
    setSelectedAnnotation: (anno: IIIFAnnotation | null) => void;
    setAnnotations: (annos: IIIFAnnotation[]) => void;
    setSearchResults: (results: any[]) => void;
    setSelectedSearchResultId: (id: string | null) => void;
    setViewerReady: (b: boolean) => void;
    setError: (msg: string) => void;
    handleManifestUpdate: (
        manifest: IIIFManifest | null,
        urls: string[],
        total: number,
        collection: IIIFCollection | null
    ) => void;
}

export function useManifestNavigator({
    manifestUrls,
    totalManifests,
    selectedManifestIndex,
    setSelectedManifestIndex,
    setSelectedImageIndex,
    setSelectedAnnotation,
    setAnnotations,
    setSearchResults,
    setSelectedSearchResultId,
    setViewerReady,
    setError,
    handleManifestUpdate,
}: UseManifestNavigatorProps) {
    const fetchManifestByIndex = useCallback(async (index: number) => {
        if (index < 0 || index >= totalManifests || index === selectedManifestIndex) return;

        const manifestUrl = manifestUrls[index];
        try {
            const { firstManifest, collection } = await parseResource(manifestUrl);
            setSelectedAnnotation(null);
            setAnnotations([]);
            setSearchResults([]);
            setSelectedSearchResultId(null);
            setViewerReady(false);
            setSelectedManifestIndex(index);
            setSelectedImageIndex(0);
            handleManifestUpdate(firstManifest, manifestUrls, totalManifests, collection ?? null);
        } catch (err) {
            console.error('Failed to fetch manifest by index:', err);
            setError('Failed to load selected manifest.');
        }
    }, [
        manifestUrls,
        totalManifests,
        selectedManifestIndex,
        setSelectedManifestIndex,
        setSelectedImageIndex,
        setSelectedAnnotation,
        setAnnotations,
        setSearchResults,
        setSelectedSearchResultId,
        setViewerReady,
        setError,
        handleManifestUpdate
    ]);

    return { fetchManifestByIndex };
}
