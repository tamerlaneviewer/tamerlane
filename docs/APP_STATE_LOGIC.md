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
| `annotationsLoading`          | True while annotations for the active canvas are being fetched (distinct from empty results). | RightPanel, App         |
| `manifestMetadata`            | Metadata for the `currentManifest` (label, provider, etc.).                                   | LeftPanel               |
| `collectionMetadata`          | Metadata for the parent collection, if one exists.                                            | LeftPanel               |
| `searchResults`               | The list of results from a content search.                                                    | RightPanel              |
| `manifestError`               | Domain-specific error for manifest loading/parsing issues.                                    | ErrorBoundary           |
| `annotationsError`            | Domain-specific error for annotation fetching issues.                                         | ErrorBoundary           |
| `searchError`                 | Domain-specific error for search service issues.                                              | ErrorBoundary           |
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
| `selectionPhase`              | Tracks the state of the annotation selection process (`idle`, `pending`, `waiting_viewer`, `waiting_annotations`, `selected`, `failed`). | iiifStore               |
| `selectionDebug`              | A boolean flag that enables detailed logging of the selection process.                        | iiifStore               |
| `selectionLog`                | An array of debug messages tracking selection attempts (when `selectionDebug` is enabled).   | iiifStore               |
| `searchAbortController`       | AbortController for cancelling active search requests.                                        | iiifStore               |
| `searchDebounceId`            | Timeout ID for search input debouncing.                                                       | iiifStore               |
| `isSearchJump`                | Flag indicating navigation originated from search result click.                                | iiifStore               |
| `panelScrollTop`              | Persisted scroll positions for annotations and search panels.                                 | RightPanel              |
| `ensureVisible`               | UI focus management for ensuring selected items are visible.                                  | RightPanel              |

> **All state is accessed and updated via the `useIIIFStore` hook.**

---

## 🔁 Application Logic and Data Flow

### Component Effects (`useEffect` in `App.tsx`)

A few `useEffect` hooks in `App.tsx` orchestrate high-level data fetching:

1.  **Initial Load (`useEffect` on `iiifContentUrl`)**:
    *   **Trigger**: The `iiifContentUrl` changes.
    *   **Action**: Loads the root manifest or collection, populating `manifestUrls` and setting the initial `currentManifest`.

2.  **Canvas Change (via store actions)**:
    *   **Trigger**: User selects a new manifest (`fetchManifestByIndex`), a new image (`setSelectedImageIndex`), or a search result navigates across canvases.
    *   **Action**: Those actions set `canvasId` directly. On change the store resets `viewerReady=false`, clears `annotations`, sets `annotationsLoading=true` (unless the new manifest has zero images, in which case `annotationsLoading=false` and `canvasId` stays empty).

3.  **Annotation Fetching (`useEffect` on `canvasId`)**:
    *   **Trigger**: The `canvasId` changes to a non-empty value.
    *   **Action**: Fetches annotations for that canvas; on completion calls `setAnnotations(annotations, canvasId)` which also ends loading and prunes any stale `selectedAnnotation`.
    *   **Key Logic**: Uses a real `AbortController` passed through `getAnnotationsForTarget -> fetchResource` so network requests are actually cancelled on rapid canvas/manifest switches (no reliance on a local stale flag). If the manifest has zero images (`canvasId === ''`) no fetch occurs and loading is not shown.

### Core Selection Logic (Centralized in Store Subscription)

Annotation selection is now fully centralized inside the store; there is **no component-level selection `useEffect`**. A lightweight subscription reacts to state changes and drives a small state machine (`selectionPhase`).

Flow summary:
1. **Intent established**: Setting `pendingAnnotationId` (e.g. via search click) causes immediate evaluation. If prerequisites are missing, phase → `waiting_viewer` or `waiting_annotations`.
2. **Prerequisites evolve**: Changes to `viewerReady`, `annotations`, `annotationsLoading`, `annotationsForCanvasId`, or `canvasId` trigger re-evaluation only if one actually changed.
3. **Attempt**: When `viewerReady` and correct-canvas annotations have finished loading (`annotationsLoading=false`), the store scans for the ID. If annotations list is empty at this point, it fast-fails.
4. **Resolution**: Match → `selected` (and clears pending). Absent → `failed` (pending cleared) preventing loops.

Key guarantees:
* Deterministic ordering independent of fetch / viewer timing.
* No transient "ready" phase (removed) — reduces noise and simplifies testing.
* Transparent progress via `selectionPhase` and optional debug log.

Phase meanings:
* `idle`: No active selection intent.
* `pending`: Intent recorded; may resolve immediately or move to a waiting phase.
* `waiting_viewer`: Awaiting viewer readiness.
* `waiting_annotations`: Awaiting annotation fetch or correct canvas alignment (`annotationsLoading=true`). When loading completes and list is empty/missing target → fast-fail.
* `selected`: Annotation found; selection complete.
* `failed`: Annotation not found after load; intent cleared.

Viewer / annotation interplay:
* `annotationsLoading` differentiates "fetch in progress" from "loaded (possibly empty)"; empty + `annotationsLoading=false` triggers immediate fail.
* Manifest / image / canvas changes reset `viewerReady`, clear annotations, and set `annotationsLoading=true` (unless zero images => stays false and no fetch is attempted).
* `setAnnotations` clears `selectedAnnotation` if it no longer exists in the new list (stale protection).

### Cancellation & Concurrency Guarantees

Annotation fetches are now cancellable at the network layer:
* Each canvas change instantiates a new `AbortController` whose signal is passed to `getAnnotationsForTarget` and down into every paginated `fetchResource` call.
* On effect cleanup (canvas or manifest switch) `controller.abort()` triggers immediate rejection with `AbortError`; the effect silently ignores these.
* This prevents wasted bandwidth / CPU on deep pagination of prior canvases during rapid navigation and removes the need for ad-hoc `isStale` guards.
* Cache entries are only populated for successful (non-aborted) responses; aborted requests do not poison the cache.

Search requests are similarly cancellable:
* Each search query creates a new `AbortController` and cancels any previous search in progress.
* Debounced search input prevents excessive network requests during typing.
* Search results are properly tagged with manifest IDs using `partOf` property or single-manifest fallback logic.

### Production Error Handling

The application uses structured domain errors with specific error codes:
* **NETWORK_MANIFEST_FETCH**: Manifest loading failures
* **NETWORK_SEARCH_FETCH**: Search service failures  
* **PARSING_MANIFEST**: Manifest parsing/structure issues
* **SEARCH_MANIFEST_UNKNOWN**: Search results with unknown manifest sources
* **SEARCH_UNSUPPORTED**: Resources without search capabilities

Each error type has:
* Specific error codes for programmatic handling
* User-friendly messages
* Recoverable vs non-recoverable classification
* Structured logging for debugging

### Enhanced Search Logic

Search result processing includes robust manifest matching:
1. **Primary**: Direct `partOf` property matching against known manifest URLs
2. **Fallback**: Single manifest assumption when `partOf` is missing
3. **Multi-manifest safety**: Results without identifiable manifests are filtered out
4. **Error handling**: Clear user feedback for navigation failures

This prevents broken search result navigation while maintaining IIIF standard compliance.

---

## 🧭 Core Logic Functions (Store Actions)

- **`handleManifestUpdate(...)`**: Updates manifest, collection, and related metadata in the store.
- **`fetchManifestByIndex(index, preserveSearchResults?)`**: Loads a manifest by its index. The optional `preserveSearchResults` flag keeps the search context when navigating between manifests from a search result.
- **`handleSearch(query)`**: Performs a content search with debouncing, tags results with their parent manifest ID using robust matching logic, and updates `searchResults` in the store.
- **`handleSearchResultClick(result)`**: Handles intra- or cross-manifest navigation with proper error handling for unknown manifests. After any manifest switch it re-establishes the selection intent (`pendingAnnotationId`) and the subscription completes the process.
- **`selectPendingAnnotation()`**: Core selection state machine that evaluates prerequisites and attempts annotation selection. Handles all timing and race conditions automatically.
- **`buildDomainError(code, message, opts?)`**: Creates structured domain errors with specific codes, user messages, and metadata for debugging.
- **`clearAllErrors()`**: Resets all domain-specific error states.
- **`requestEnsureVisible(tab, id)`**: Requests UI to scroll and focus on specific annotation or search result.

---

## 🧩 Component Interaction

- **Header**: Receives navigation, search, and language state/handlers from the store.
- **LeftPanel**: Receives manifest and collection metadata from the store.
- **MiddlePanel**: Receives image/canvas data, `selectedAnnotation`, and the `viewerReady` state. It calls `handleViewerReady` when it's done loading.
- **RightPanel**: Receives `annotations`, `searchResults`, `pendingAnnotationId`, and the active tab state from the store. It triggers selection actions.
- **UrlDialog / ErrorDialog**: Visibility is driven entirely by the `showUrlDialog` and `error` state variables in the store.
