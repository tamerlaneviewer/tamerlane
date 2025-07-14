
# State and Logic Reference for App.tsx

## 📦 State Variables

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

## 🔁 Side Effects (useEffect)

### Effect 1 — Dependencies: `[ currentManifest, selectedImageIndex ]`
Sets the current canvasId when the manifest or image index changes.

### Effect 2 — Dependencies: `[ currentManifest, canvasId, selectedManifestIndex, manifestUrls ]`
Fetches annotations for the current canvas and manifest.

### Effect 3 — Dependencies: `[ annotations, pendingAnnotationId, viewerReady ]`
Selects an annotation by ID after the viewer is ready.

### Effect 4 — Dependencies: `[ iiifContentUrl ]`
Loads the initial manifest/collection when the IIIF content URL changes.

## 🧭 Core Logic Functions

- `handleManifestUpdate(firstManifest, manifestUrls, total, collection)` — Updates manifest, collection, and related metadata state after loading a resource.
- `fetchManifestByIndex(index)` — Loads a manifest by its index in the collection.
- `handleSearch(query)` — Performs a content search and updates search results.
- `handleSearchResultClick(canvasTarget, manifestId?, searchResultId?)` — Navigates to a search result and selects the relevant annotation.
- `handleViewerReady()` — Sets viewerReady to true when the image viewer is ready for annotation selection.
- `handleUrlSubmit(event)` — Handles submission of a new IIIF content URL.

## 🧩 Component Interaction

- **Header**: Receives navigation, search, and language state/handlers.
- **LeftPanel**: Receives manifest and collection metadata.
- **MiddlePanel**: Receives image/canvas data and selected annotation.
- **RightPanel**: Receives annotations, search results, and active tab state.
- **UrlDialog**: Shown when no IIIF content URL is set.
- **ErrorDialog**: Shown when an error occurs.

## ⚠️ Error Handling & User Flow

- If an error occurs (e.g., failed manifest load), the app displays an error dialog and may prompt for a new IIIF URL.
- If no IIIF content URL is set, the app shows the URL input dialog.

## 📚 Further Reading

- [IIIF Presentation API](https://iiif.io/api/presentation/)
- [App.tsx source code](../src/App.tsx)


## 🔁 Side Effects (useEffect)

### Effect 1 — Dependencies: `[ currentManifest, selectedImageIndex ]`

```ts
if (currentManifest && selectedImageIndex >= 0) {
      const selectedImage = currentManifest.images[selectedImageIndex];
      setCanvasId(selectedImage?.canvasTarget || '');
    }...
```

### Effect 2 — Dependencies: `[ currentManifest, canvasId, selectedManifestIndex, manifestUrls ]`

```ts
if (!currentManifest || !canvasId || manifestUrls.length === 0) return;

    const manifestUrl = manifestUrls[selectedManifestIndex];

    const fetchAnnotations = async () => {
      try {
        const results = await getAnnotationsForTarget(manifestUrl, canvasId);
        setAnnotations(results);...
```

### Effect 3 — Dependencies: `[ annotations, pendingAnnotationId, viewerReady ]`

```ts
if (!pendingAnnotationId || annotations.length === 0 || !viewerReady)
      return;

    const match = annotations.find((anno) => anno.id === pendingAnnotationId);

    if (match) {
      setSelectedAnnotation(match);
      console.log('Selected annotation by ID:', match.id);
      setPendingAnnotat...
```

### Effect 4 — Dependencies: `[ iiifContentUrl ]`

```ts
if (!iiifContentUrl) return;

    const fetchInitialManifest = async () => {
      try {
        const { firstManifest, manifestUrls, total, collection } =
          await parseResource(iiifContentUrl);
        handleManifestUpdate(
          firstManifest,
          manifestUrls,
          total,
 ...
```


## 🧭 Core Logic Functions

- `handleManifestUpdate()` — custom logic function used in the app

- `fetchManifestByIndex()` — custom logic function used in the app

- `handleSearch()` — custom logic function used in the app

- `handleSearchResultClick()` — custom logic function used in the app

- `handleViewerReady()` — custom logic function used in the app

- `handleUrlSubmit()` — custom logic function used in the app
