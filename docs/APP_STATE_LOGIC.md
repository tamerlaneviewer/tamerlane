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
| `pendingAnnotationId`         | An annotation ID queued for selection, waiting for the viewer and annotations to be ready.    | App, RightPanel         |
| `selectedSearchResultId`      | The ID of the search result currently selected, used for highlighting.                        | RightPanel              |
| `autocompleteUrl`             | The endpoint URL for the search autocomplete service.                                         | Header                  |
| `searchUrl`                   | The endpoint URL for the main content search service.                                         | Header, RightPanel      |
| `selectedLanguage`            | The language selected for displaying multilingual metadata and annotations.                   | Header, Panels          |
| `viewerReady`                 | A flag indicating if the image viewer is fully loaded and ready for interaction.              | MiddlePanel, App        |
| `searching`                   | A flag to indicate that a search query is currently in progress.                              | Header, RightPanel      |

> **All state is accessed and updated via the `useIIIFStore` hook.**

---

## 🔁 Side Effects (`useEffect` in App.tsx)

Zustand actions and state are used inside `useEffect` hooks to coordinate data fetching and UI updates.

### Effect 1 — `[ currentManifest, selectedImageIndex, ... ]`
Sets the current `canvasId` in the store whenever the manifest or the selected image index changes.

### Effect 2 — `[ canvasId, ... ]`
Fetches the list of annotations (`annotations`) for the current `canvasId`. 
**Key Logic**: This effect includes a cleanup function that sets a `isStale` flag. If another `canvasId` change occurs before the current annotation request finishes, the cleanup function runs, and the stale request's results are ignored, preventing race conditions.

### Effect 3 — `[ pendingAnnotationId, annotations, viewerReady, ... ]`
**The core selection logic.** When an annotation is pending (`pendingAnnotationId` is set), this effect waits for the `annotations` to load for the correct `canvasId` and for the `viewerReady` flag to be true. It then finds the matching annotation, sets it as `selectedAnnotation`, and clears the `pendingAnnotationId`.

### Effect 4 — `[ iiifContentUrl, ... ]`
Loads the initial manifest or collection when the `iiifContentUrl` changes. This is the main entry point for loading new content.

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
