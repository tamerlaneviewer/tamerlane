# State and Logic Reference for App.tsx

## 📦 State Variables

- **activePanelTab** / **setActivePanelTab** — declared via `useState`; manages part of the app's state.

- **iiifContentUrl** / **setIiifContentUrl** — declared via `useState`; manages part of the app's state.

- **currentManifest** / **setCurrentManifest** — declared via `useState`; manages part of the app's state.

- **canvasId** / **setCanvasId** — declared via `useState`; manages part of the app's state.

- **manifestUrls** / **setManifestUrls** — declared via `useState`; manages part of the app's state.

- **totalManifests** / **setTotalManifests** — declared via `useState`; manages part of the app's state.

- **selectedManifestIndex** / **setSelectedManifestIndex** — declared via `useState`; manages part of the app's state.

- **selectedImageIndex** / **setSelectedImageIndex** — declared via `useState`; manages part of the app's state.

- **annotations** / **setAnnotations** — declared via `useState`; manages part of the app's state.

- **manifestMetadata** / **setManifestMetadata** — declared via `useState`; manages part of the app's state.

- **collectionMetadata** / **setCollectionMetadata** — declared via `useState`; manages part of the app's state.

- **searchResults** / **setSearchResults** — declared via `useState`; manages part of the app's state.

- **error** / **setError** — declared via `useState`; manages part of the app's state.

- **showUrlDialog** / **setShowUrlDialog** — declared via `useState`; manages part of the app's state.

- **selectedAnnotation** / **setSelectedAnnotation** — declared via `useState`; manages part of the app's state.

- **pendingAnnotationId** / **setPendingAnnotationId** — declared via `useState`; manages part of the app's state.

- **selectedSearchResultId** / **setSelectedSearchResultId** — declared via `useState`; manages part of the app's state.

- **autocompleteUrl** / **setAutocompleteUrl** — declared via `useState`; manages part of the app's state.

- **searchUrl** / **setSearchUrl** — declared via `useState`; manages part of the app's state.

- **selectedLanguage** / **setSelectedLanguage** — declared via `useState`; manages part of the app's state.


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
