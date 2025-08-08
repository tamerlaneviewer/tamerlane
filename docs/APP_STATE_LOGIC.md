# State and Logic Reference for App.tsx

## 📦 State Variables (Managed by Zustand Store)

| State Variable                | Purpose/Usage                                                                                 | Component(s) Used In |
|-------------------------------|-----------------------------------------------------------------------------------------------|-------------------------|
| `activePanelTab`              | Which tab is active in the right panel (`annotations` or `search`).                           | RightPanel              |
| `iiifContentUrl`              | The root IIIF manifest or collection URL being viewed.                                        | App, UrlDialog          |
| `currentManifest`             | The fully loaded IIIF manifest object currently being displayed.                              | App, MiddlePanel        |
| `canvasId`                    | The ID of the current canvas/image being viewed.                                              | App, MiddlePanel        |
| `manifestUrls`                | A list of all manifest URLs in the current collection.                                        | App, LeftPanel          |
| `totalManifests`              | The total number of manifests in the collection.                                              | App, Header             |
| `selectedManifestIndex`       | The index of the currently selected manifest in the `manifestUrls` list.                      | App, Header             |
| `selectedImageIndex`          | The index of the currently selected image/canvas within the `currentManifest`.                | App, Header             |
| `annotations`                 | A list of annotations for the current canvas.                                                 | RightPanel              |
| `manifestMetadata`            | Metadata for the `currentManifest` (label, provider, etc.).                                   | LeftPanel               |
| `collectionMetadata`          | Metadata for the parent collection, if one exists.                                            | LeftPanel               |
| `searchResults`               | The list of results from a content search.                                                    | RightPanel              |
| `error`                       | An error message for user feedback. Triggers the error dialog.                                | ErrorDialog             |
| `showUrlDialog`               | A flag to control the visibility of the IIIF URL input dialog.                                | UrlDialog               |
| `selectedAnnotation`          | The annotation object that is currently selected by the user.                                 | MiddlePanel, RightPanel |
| `pendingAnnotationId`         | An annotation ID queued for selection. The store's subscription logic will automatically attempt to select it once all conditions are met. | App, RightPanel         |
| `selectedSearchResultId`      | The ID of the search result currently selected, used for highlighting.                        | RightPanel              |
| `autocompleteUrl`             | The endpoint URL for the search autocomplete service.                                         | Header                  |
| `searchUrl`                   | The endpoint URL for the main content search service.                                         | Header, RightPanel      |
| `selectedLanguage`            | The language selected for displaying multilingual metadata and annotations.                   | Header, Panels          |
| `viewerReady`                 | A flag indicating if the image viewer is fully loaded. A key condition for triggering automatic annotation selection. | MiddlePanel, App        |
| `searching`                   | A flag to indicate that a search query is currently in progress.                              | Header, RightPanel      |
| `isNavigating`                | A flag to indicate navigation between images/manifests is in progress, distinct from searching. | App, Header             |
| `annotationsForCanvasId`      | The canvas ID for the currently loaded `annotations`. Prevents race conditions.               | App, iiifStore          |
| `currentCollection`           | The fully loaded IIIF collection object currently being displayed.                            | App, LeftPanel          |
| `selectionPhase`              | Tracks the state of the annotation selection process (`idle`, `pending`, `waiting_viewer`, `waiting_annotations`, `ready`, `selected`, `failed`). | iiifStore               |
| `selectionDebug`              | A boolean flag that enables detailed logging of the selection process.                        | iiifStore               |
| `selectionLog`                | An array of debug messages tracking selection attempts (when `selectionDebug` is enabled).   | iiifStore               |

> **All state is accessed and updated via the `useIIIFStore` hook.**

---

## 🔁 Application Logic and Data Flow

### Component Effects (`useEffect` in `App.tsx`)

A few `useEffect` hooks in `App.tsx` orchestrate high-level data fetching:

1.  **Initial Load (`useEffect` on `iiifContentUrl`)**:
    *   **Trigger**: The `iiifContentUrl` changes.
    *   **Action**: Loads the root manifest or collection, populating `manifestUrls` and setting the initial `currentManifest`.

2.  **Canvas Change (`useEffect` on `currentManifest`, `selectedImageIndex`)**:
    *   **Trigger**: The user selects a new manifest or a new image within the current manifest.
    *   **Action**: Updates the `canvasId` in the store to reflect the new view.

3.  **Annotation Fetching (`useEffect` on `canvasId`)**:
    *   **Trigger**: The `canvasId` changes.
    *   **Action**: Fetches the list of annotations for the new canvas.
    *   **Key Logic**: This effect includes a cleanup function with an `isStale` flag. If the `canvasId` changes again before the current request finishes, the `isStale` flag ensures that the outdated results are ignored, preventing race conditions where annotations for a previous canvas could overwrite the current list.

### Core Selection Logic (Centralized in Store Subscription)

Annotation selection is now fully centralized inside the store; there is **no component-level selection `useEffect`**. A lightweight subscription reacts to state changes and drives a small state machine (`selectionPhase`).

Flow summary:
1. **Pending set**: When `pendingAnnotationId` is set (e.g. from a search result click), the subscription immediately invokes `selectPendingAnnotation()`. If prerequisites are missing, the phase transitions to `waiting_viewer` or `waiting_annotations`.
2. **Prerequisites evolve**: Subsequent changes to `viewerReady`, `annotations`, or `annotationsForCanvasId` re-trigger evaluation only if they actually changed since last check.
3. **Conditions satisfied**: When all are true (viewer ready, annotations loaded for current canvas, non-empty list) a lookup scans the annotations array for the pending ID.
4. **Resolution**: Match found → phase `selected`, state updates `selectedAnnotation` and clears `pendingAnnotationId`. Not found → phase `failed` and pending cleared (prevents stale looping).

Key guarantees:
- Deterministic: Order of viewer readiness vs annotation arrival no longer matters.
- Idempotent: Repeated evaluations without state change do nothing (no infinite loops).
- Simple: Array scan is retained (dataset expected to be small) after reverting a previously trialed map structure.
- Transparent: `selectionPhase` exposes progress externally for debugging or UI affordances.

Phase meanings:
- `idle`: No pending selection.
- `pending`: Initial state after a request (may transition immediately to a waiting_* phase).
- `waiting_viewer`: Waiting for image viewer readiness.
- `waiting_annotations`: Waiting for annotations (or correct canvas annotations) to be available.
- `ready`: Transient internal checkpoint just before attempting resolution.
- `selected`: Successful resolution.
- `failed`: Annotation ID not present in loaded list; system cleaned up.

---

## 🧭 Core Logic Functions (Store Actions)

- **`handleManifestUpdate(...)`**: Updates manifest, collection, and related metadata in the store.
- **`fetchManifestByIndex(index, preserveSearchResults?)`**: Loads a manifest by its index. The optional `preserveSearchResults` flag keeps the search context when navigating between manifests from a search result.
- **`handleSearch(query)`**: Performs a content search, tags results with their parent manifest ID, and updates `searchResults` in the store.
- **`handleSearchResultClick(result)`**: Determines if the result targets the current canvas or requires navigation. It sets `pendingAnnotationId`, adjusts indices if needed, and relies on the subscription to drive selection (no manual effect).
- **`handleViewerReady()`**: A simple handler passed to the viewer component, which calls `setViewerReady(true)` in the store.

---

## 🧩 Component Interaction

- **Header**: Receives navigation, search, and language state/handlers from the store.
- **LeftPanel**: Receives manifest and collection metadata from the store.
- **MiddlePanel**: Receives image/canvas data, `selectedAnnotation`, and the `viewerReady` state. It calls `handleViewerReady` when it's done loading.
- **RightPanel**: Receives `annotations`, `searchResults`, `pendingAnnotationId`, and the active tab state from the store. It triggers selection actions.
- **UrlDialog / ErrorDialog**: Visibility is driven entirely by the `showUrlDialog` and `error` state variables in the store.
