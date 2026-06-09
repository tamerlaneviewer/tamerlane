import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useIIIFStore } from '../store/iiifStore';
import { useContentStateRestoration } from './useContentStateRestoration';
import { encodeContentState } from '../utils/contentState';

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const Harness: React.FC = () => {
  useContentStateRestoration();
  return null;
};

const renderAt = (entry: string) =>
  render(
    <MemoryRouter
      initialEntries={[entry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Harness />
    </MemoryRouter>,
  );

const initialState = useIIIFStore.getState();

describe('useContentStateRestoration', () => {
  beforeEach(() => {
    act(() => {
      useIIIFStore.setState(initialState);
    });
    jest.clearAllMocks();
  });

  it('does nothing when there is no iiif-content param', () => {
    renderAt('/');
    expect(useIIIFStore.getState().iiifContentUrl).toBeNull();
  });

  it('loads a plain manifest URL directly', () => {
    const url = 'https://example.com/manifest.json';
    renderAt(`/?iiif-content=${encodeURIComponent(url)}`);
    expect(useIIIFStore.getState().iiifContentUrl).toBe(url);
  });

  it('rejects an unsafe scheme and surfaces a manifest error', () => {
    const setManifestError = jest.fn();
    act(() => {
      useIIIFStore.setState({ setManifestError });
    });
    renderAt('/?iiif-content=javascript:alert(1)');
    expect(setManifestError).toHaveBeenCalledTimes(1);
    expect(setManifestError.mock.calls[0][0]).toMatchObject({
      code: 'NETWORK_MANIFEST_FETCH',
    });
    expect(useIIIFStore.getState().iiifContentUrl).toBeNull();
  });

  it('drives manifest → canvas navigation, draws the region and focuses the panel', () => {
    const canvas = 'https://example.com/canvas/1#xywh=0,0,10,10';
    const canvasId = 'https://example.com/canvas/1';
    const manifest = 'https://example.com/m1';
    const collection = 'https://example.com/collection.json';
    const encoded = encodeContentState(canvas, manifest, collection);

    const fetchManifestByIndex = jest.fn();
    const setSelectedImageIndex = jest.fn();
    const setActivePanelTab = jest.fn();
    const setPendingAnnotationId = jest.fn();
    const setContentStateRegion = jest.fn();
    act(() => {
      useIIIFStore.setState({
        fetchManifestByIndex,
        setSelectedImageIndex,
        setActivePanelTab,
        setPendingAnnotationId,
        setContentStateRegion,
      });
    });

    // The link is fully self-contained: only iiif-content, no extra params.
    renderAt(`/?iiif-content=${encodeURIComponent(encoded)}`);

    // Step 1: the collection (from the blob's nested partOf) becomes the
    // content URL, not the encoded blob itself.
    expect(useIIIFStore.getState().iiifContentUrl).toBe(collection);

    // Step 2: when the requested manifest is not yet current, navigate to it.
    act(() => {
      useIIIFStore.setState({
        manifestUrls: ['https://example.com/m0', manifest],
        selectedManifestIndex: 0,
      });
    });
    expect(fetchManifestByIndex).toHaveBeenCalledWith(1);

    // Step 3: once that manifest is current, select the target canvas.
    act(() => {
      useIIIFStore.setState({
        selectedManifestIndex: 1,
        currentManifest: {
          info: {},
          images: [{ canvasTarget: canvasId }],
        } as any,
      });
    });
    expect(setSelectedImageIndex).toHaveBeenCalledWith(0);

    // Step 4: once the viewer is ready on that canvas, draw the shared region
    // and focus the annotation panel. No specific annotation is selected.
    act(() => {
      useIIIFStore.setState({ viewerReady: true, canvasId });
    });
    expect(setActivePanelTab).toHaveBeenCalledWith('annotations');
    expect(setContentStateRegion).toHaveBeenCalledWith(canvas);
    expect(setPendingAnnotationId).not.toHaveBeenCalled();
  });

  it('focuses the annotation panel without waiting on annotations to load', () => {
    const canvas = 'https://example.com/canvas/1#xywh=0,0,10,10';
    const canvasId = 'https://example.com/canvas/1';
    const manifest = 'https://example.com/m1';
    const encoded = encodeContentState(canvas, manifest);

    const setActivePanelTab = jest.fn();
    const setContentStateRegion = jest.fn();
    act(() => {
      useIIIFStore.setState({ setActivePanelTab, setContentStateRegion });
    });

    renderAt(`/?iiif-content=${encodeURIComponent(encoded)}`);

    act(() => {
      useIIIFStore.setState({
        manifestUrls: [manifest],
        selectedManifestIndex: 0,
        currentManifest: {
          info: {},
          images: [{ canvasTarget: canvasId }],
        } as any,
      });
    });

    // Viewer ready on the target canvas: draw the region and focus the panel
    // immediately, even though no annotations have loaded yet.
    act(() => {
      useIIIFStore.setState({
        viewerReady: true,
        canvasId,
        annotations: [],
        annotationsForCanvasId: null,
      });
    });
    expect(setActivePanelTab).toHaveBeenCalledWith('annotations');
    expect(setContentStateRegion).toHaveBeenCalledWith(canvas);
  });

  it('navigates without drawing a region for a whole-canvas target', () => {
    const canvas = 'https://example.com/canvas/1';
    const manifest = 'https://example.com/m1';
    const encoded = encodeContentState(canvas, manifest);

    const setActivePanelTab = jest.fn();
    const setContentStateRegion = jest.fn();
    act(() => {
      useIIIFStore.setState({ setActivePanelTab, setContentStateRegion });
    });

    renderAt(`/?iiif-content=${encodeURIComponent(encoded)}`);

    act(() => {
      useIIIFStore.setState({
        manifestUrls: [manifest],
        selectedManifestIndex: 0,
        currentManifest: {
          info: {},
          images: [{ canvasTarget: canvas }],
        } as any,
      });
    });
    act(() => {
      useIIIFStore.setState({ viewerReady: true, canvasId: canvas });
    });

    expect(setActivePanelTab).toHaveBeenCalledWith('annotations');
    expect(setContentStateRegion).not.toHaveBeenCalled();
  });
});
