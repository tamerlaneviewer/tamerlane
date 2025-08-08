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
| `selectionPhase`              | Tracks the state of the annotation selection process (`idle`, `pending`, `selected`, `failed`). | iiifStore               |
| `selectionDebug`              | A log of the last significant event in the selection process, for debugging.                  | iiifStore               |

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

### Core Selection Logic (Zustand `subscribe` in `iiifStore.ts`)

The complex logic for selecting an annotation is no longer in a component `useEffect`. Instead, the `iiifStore` subscribes to its own state changes, creating a reactive and deterministic flow.

1.  **Trigger**: The subscription fires on *every* state change in the store.

2.  **Guard**: It first checks if an annotation selection is pending (`pendingAnnotationId` is not null). If not, it does nothing.

3.  **Condition Validation**: If an annotation is pending, it checks if all prerequisites for selection have been met:
    *   Is the viewer ready? (`viewerReady === true`)
    *   Are the annotations loaded? (`annotations.length > 0`)
    *   Do the loaded annotations belong to the current canvas? (`annotationsForCanvasId === canvasId`)
    *   Is the selection process in a "waiting" state? (`selectionPhase` is `pending`, `waiting_viewer`, or `waiting_annotations`)

4.  **Action**: If and only if all conditions are met, it calls the `selectPendingAnnotation` action *within the store*. This action finds the annotation object by its ID, sets it as the `selectedAnnotation`, and updates the `selectionPhase` to `selected` or `failed`.

This subscription-based architecture is the key to eliminating race conditions. It doesn't matter in what order the viewer becomes ready or the annotations arrive; the selection will only proceed when the state is confirmed to be correct.

---

## 🧭 Core Logic Functions (Store Actions)

- **`handleManifestUpdate(...)`**: Updates manifest, collection, and related metadata in the store.
- **`fetchManifestByIndex(index, preserveSearchResults?)`**: Loads a manifest by its index. The optional `preserveSearchResults` flag keeps the search context when navigating between manifests from a search result.
- **`handleSearch(query)`**: Performs a content search, tags results with their parent manifest ID, and updates `searchResults` in the store.
- **`handleSearchResultClick(result)`**: The primary action for search interaction. It intelligently determines if the result is on the current canvas (for a quick selection) or a new canvas (triggering a full load), then sets the `pendingAnnotationId` to start the selection process.
- **`handleViewerReady()`**: A simple handler passed to the viewer component, which calls `setViewerReady(true)` in the store.

---

## 🧩 Component Interaction

- **Header**: Receives navigation, search, and language state/handlers from the store.
- **LeftPanel**: Receives manifest and collection metadata from the store.
- **MiddlePanel**: Receives image/canvas data, `selectedAnnotation`, and the `viewerReady` state. It calls `handleViewerReady` when it's done loading.
- **RightPanel**: Receives `annotations`, `searchResults`, `pendingAnnotationId`, and the active tab state from the store. It triggers selection actions.
- **UrlDialog / ErrorDialog**: Visibility is driven entirely by the `showUrlDialog` and `error` state variables in the store.
