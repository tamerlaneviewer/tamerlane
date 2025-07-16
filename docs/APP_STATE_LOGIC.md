# State and Logic Reference for App.tsx

## 📦 State Variables (Managed by Zustand Store)

| State Variable                | Purpose/Usage                                                                                 | Component(s)         |
|-------------------------------|----------------------------------------------------------------------------------------------|----------------------|
| activePanelTab                | Which tab is active in the right panel (annotations/search results)                          | RightPanel           |
| iiifContentUrl                | IIIF manifest/collection URL being viewed                                                    | App, UrlDialog       |
| currentManifest               | The currently loaded IIIF manifest                                                           | App, MiddlePanel     |
| canvasId                      | The current canvas/image being viewed                                                        | App, MiddlePanel     |
| manifestUrls                  | List of manifest URLs in the current collection                                              | App, LeftPanel       |
| totalManifests                | Total number of manifests in the collection                                                  | App, Header          |
| selectedManifestIndex         | Index of the selected manifest                                                               | App, Header          |
| selectedImageIndex            | Index of the selected image/canvas                                                           | App, Header          |
| annotations                   | List of annotations for the current canvas                                                   | RightPanel           |
| manifestMetadata              | Metadata for the current manifest                                                            | LeftPanel            |
| collectionMetadata            | Metadata for the current collection                                                          | LeftPanel            |
| searchResults                 | Results from content search                                                                  | RightPanel           |
| error                         | Error message for user feedback                                                              | ErrorDialog          |
| showUrlDialog                 | Whether to show the IIIF URL input dialog                                                    | UrlDialog            |
| selectedAnnotation            | The annotation currently selected                                                            | MiddlePanel, RightPanel |
| pendingAnnotationId           | Annotation ID to select after viewer is ready                                                | App                  |
| selectedSearchResultId        | ID of the selected search result                                                             | RightPanel           |
| autocompleteUrl               | Endpoint for search autocomplete                                                             | Header               |
| searchUrl                     | Endpoint for content search                                                                  | Header, RightPanel   |
| selectedLanguage              | Language selected for UI/metadata display                                                    | Header               |
| viewerReady                   | Whether the image viewer is ready for annotation selection                                   | MiddlePanel, App     |
| searching                     | Whether a search is currently in progress                                                    | Header, RightPanel   |

> **All state is accessed and updated via the `useIIIFStore` hook.**

---

## 🔁 Side Effects (useEffect in App.tsx)

Zustand actions and state are used inside effects to coordinate data fetching and UI updates.

### Effect 1 — `[ currentManifest, selectedImageIndex ]`
Sets the current canvasId in the store when the manifest or image index changes.

### Effect 2 — `[ currentManifest, canvasId, selectedManifestIndex, manifestUrls ]`
Fetches annotations for the current canvas and manifest using a store action.

### Effect 3 — `[ annotations, pendingAnnotationId, viewerReady ]`
Selects an annotation by ID after the viewer is ready, updating store state.

### Effect 4 — `[ iiifContentUrl ]`
Loads the initial manifest/collection when the IIIF content URL changes, using a store action.

### Effect 5 — `[ currentManifest, currentCollection ]`
Updates autocomplete and search URLs in the store when manifest or collection changes.

### Effect 6 — `[ iiifContentUrl, iiifContentUrlFromParams ]`
Shows the URL dialog if no IIIF content URL is set.

---

## 🧭 Core Logic Functions (Now Store Actions)

- `handleManifestUpdate(firstManifest, manifestUrls, total, collection)` — Updates manifest, collection, and related metadata state in the store.
- `fetchManifestByIndex(index)` — Loads a manifest by its index using a store action.
- `handleSearch(query)` — Performs a content search and updates search results in the store.
- `handleSearchResultClick(canvasTarget, manifestId?, searchResultId?)` — Navigates to a search result and selects the relevant annotation via the store.
- `handleViewerReady()` — Sets viewerReady to true in the store when the image viewer is ready.
- `handleUrlSubmit(event)` — Handles submission of a new IIIF content URL, updating store state.

---

## 🧩 Component Interaction

- **Header**: Receives navigation, search, and language state/handlers from the store.
- **LeftPanel**: Receives manifest and collection metadata from the store.
- **MiddlePanel**: Receives image/canvas data and selected annotation from the store.
- **RightPanel**: Receives annotations, search results, and active tab state from the store.
- **UrlDialog**: Shown when no IIIF content URL is set (store-driven).
- **ErrorDialog**: Shown when an error occurs (store-driven).

---

## ⚠️ Error Handling & User Flow

- If an error occurs (e.g., failed manifest load), the app displays an error dialog and may prompt for a new IIIF URL (store-driven).
- If no IIIF content URL is set, the app shows the URL input dialog (store-driven).

---

## 📚 Further Reading

- [IIIF Presentation API](https://iiif.io/api/presentation/)
- [App.tsx source code](../src/App.tsx)
- [Zustand documentation](https://zustand-demo.pmnd.rs/)
