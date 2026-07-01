import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIIIFStore } from '../store/iiifStore.ts';
import { interpretContentStateParam } from '../utils/contentState.ts';

// Pending content-state restoration tracked as a single object so the fields
// are always set/cleared together. `null` means “no restoration in progress”.
interface PendingContentState {
  target: string | null;
  manifestUrl: string | null;
}

/**
 * Drives restoration of a IIIF Content State (or plain manifest/collection URL)
 * from the `iiif-content` query parameter. The blob is self-contained and fully
 * spec-compliant: it carries only standard Presentation resources (a canvas
 * region target, with the parent collection nested via the manifest's
 * `partOf`).
 *
 * The flow is a small, reactive state machine:
 *   1. Decode the param and load the resource (sets `iiifContentUrl`).
 *   2. Once the manifest list is known, select the requested manifest.
 *   3. Once that manifest is current, select the requested canvas.
 *   4. Once the viewer is ready on that canvas, draw the shared region in the
 *      viewer (via `contentStateRegion`) and focus the annotation panel.
 *
 * Restoration deliberately stops at the canvas/region: the shared `#xywh` is
 * drawn as a region overlay in the viewer, but we do not resolve or highlight a
 * specific annotation in the list. IIIF Content State has no "selected
 * annotation" concept; sharing a particular annotation's identity is handled
 * separately by the "Copy Annotation ID" action.
 *
 * Each step depends on reactive store signals (`manifestUrls`, `currentManifest`,
 * `viewerReady`, `canvasId`), so the steps are expressed as effects rather than a
 * single imperative function. Keeping them here keeps `App` declarative and makes
 * the restoration flow independently testable.
 */
export function useContentStateRestoration(): void {
  const [searchParams] = useSearchParams();
  const iiifContentUrlFromParams = searchParams.get('iiif-content');

  // Store state the restoration steps react to.
  const manifestUrls = useIIIFStore((s) => s.manifestUrls);
  const selectedManifestIndex = useIIIFStore((s) => s.selectedManifestIndex);
  const currentManifest = useIIIFStore((s) => s.currentManifest);
  const viewerReady = useIIIFStore((s) => s.viewerReady);
  const canvasId = useIIIFStore((s) => s.canvasId);

  // Store actions the restoration steps drive.
  const setIiifContentUrl = useIIIFStore((s) => s.setIiifContentUrl);
  const setManifestError = useIIIFStore((s) => s.setManifestError);
  const resetResourceContext = useIIIFStore((s) => s.resetResourceContext);
  const setSelectedImageIndex = useIIIFStore((s) => s.setSelectedImageIndex);
  const setActivePanelTab = useIIIFStore((s) => s.setActivePanelTab);
  const setContentStateRegion = useIIIFStore((s) => s.setContentStateRegion);
  const fetchManifestByIndex = useIIIFStore((s) => s.fetchManifestByIndex);

  const [pendingContentState, setPendingContentState] =
    useState<PendingContentState | null>(null);
  const previousResourceUrlRef = useRef<string | null>(null);

  // Step 1: decode the query params and kick off resource loading.
  useEffect(() => {
    if (!iiifContentUrlFromParams) return;
    const result = interpretContentStateParam(iiifContentUrlFromParams);

    if (result.kind === 'error') {
      // Decoding, JSON parsing, or Manifest discovery failed. Surface the
      // stage-specific message so the user knows what went wrong.
      setPendingContentState(null);
      setManifestError({
        code: 'NETWORK_MANIFEST_FETCH',
        message: result.message,
        at: Date.now(),
        recoverable: true,
      });
      return;
    }

    const nextResourceUrl =
      result.kind === 'content-state'
        ? (result.state.collectionUrl ?? result.state.manifestUrl)
        : result.url;

    // When the underlying resource changes (e.g. user pastes a new share link),
    // clear the previous resource's derived state before loading the new one.
    if (
      previousResourceUrlRef.current &&
      previousResourceUrlRef.current !== nextResourceUrl
    ) {
      resetResourceContext();
    }
    previousResourceUrlRef.current = nextResourceUrl;
    setIiifContentUrl(nextResourceUrl);

    if (result.kind === 'content-state') {
      setPendingContentState({
        target: result.state.canvasTarget ?? null,
        manifestUrl: result.state.manifestUrl,
      });
    } else {
      setPendingContentState(null);
    }
  }, [
    iiifContentUrlFromParams,
    resetResourceContext,
    setIiifContentUrl,
    setManifestError,
  ]);

  // Step 2: once the manifest list is known, navigate to the requested manifest.
  useEffect(() => {
    const pendingManifestUrl = pendingContentState?.manifestUrl ?? null;
    if (!pendingManifestUrl || manifestUrls.length === 0) return;
    const currentManifestUrl = manifestUrls[selectedManifestIndex] ?? null;
    if (currentManifestUrl === pendingManifestUrl) return;
    const targetIndex = manifestUrls.findIndex(
      (url) => url === pendingManifestUrl,
    );
    if (targetIndex >= 0) {
      fetchManifestByIndex(targetIndex);
    }
  }, [
    pendingContentState,
    manifestUrls,
    selectedManifestIndex,
    fetchManifestByIndex,
  ]);

  // Step 3: once the requested manifest is current, select the target canvas.
  useEffect(() => {
    const pendingTarget = pendingContentState?.target ?? null;
    const pendingManifestUrl = pendingContentState?.manifestUrl ?? null;
    if (!currentManifest || !pendingTarget) return;
    // If a specific manifest was requested, wait until it's the current one
    // before resolving the canvas index — otherwise a same-named canvas in a
    // sibling manifest could grab focus during the in-between fetch.
    if (
      pendingManifestUrl &&
      manifestUrls.length > 0 &&
      manifestUrls[selectedManifestIndex] !== pendingManifestUrl
    ) {
      return;
    }
    const targetCanvasId = pendingTarget.split('#')[0];
    const targetIndex = currentManifest.images.findIndex(
      (img) => img.canvasTarget === targetCanvasId,
    );
    if (targetIndex >= 0) {
      setSelectedImageIndex(targetIndex);
    }
  }, [
    currentManifest,
    pendingContentState,
    manifestUrls,
    selectedManifestIndex,
    setSelectedImageIndex,
  ]);

  // Step 4: once the viewer is ready on the target canvas, draw the shared
  // region in the viewer and focus the annotation panel. We intentionally do
  // not resolve or highlight a specific annotation in the list (Content State
  // has no "selected annotation" concept); the region overlay is driven
  // directly from the canvas target.
  useEffect(() => {
    const pendingTarget = pendingContentState?.target ?? null;
    if (!pendingTarget || !viewerReady) return;
    const targetCanvasId = pendingTarget.split('#')[0];
    if (canvasId !== targetCanvasId) return;

    setActivePanelTab('annotations');
    // Only a target carrying a fragment (#xywh / #svg) identifies a region to
    // draw; a bare canvas target navigates without an overlay.
    if (pendingTarget.includes('#')) {
      setContentStateRegion(pendingTarget);
    }
    setPendingContentState(null);
  }, [
    pendingContentState,
    viewerReady,
    canvasId,
    setActivePanelTab,
    setContentStateRegion,
  ]);
}
