# Tamerlane

Tamerlane is a lightweight IIIF (International Image Interoperability Framework) viewer built to make exploring, navigating, and searching annotated IIIF Presentation 3.0 resources simple and intuitive. Rather than aiming to be feature‑heavy, it focuses on delivering a clear, user‑friendly experience for working with annotated resources.

![Screenshot of Tamerlane](assets/screenshot.png)

## 🎬 Demo

A demo of the viewer is available with content from the Wellcome Collection: 
[**The chemist and the druggist**](https://tamerlaneviewer.github.io/tamerlane/?iiif-content=https://iiif.wellcomecollection.org/presentation/b19974760). Please note, search is only available for Content Search 2.0 endpoints. 

The following example demonstrates searching a collection that has been indexed using the [Annosearch](https://github.com/nationalarchives/annosearch) search service: 
![Tamerlane IIIF Viewer Demo](/assets/demo.gif)

## 🚀 Getting Started

### Installation

1. Clone the repository:
```bash
git clone https://github.com/tamerlaneviewer/tamerlane.git
cd tamerlane
```

2. Install dependencies:
```bash
npm install
```

### Running the Application

#### Development Mode
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

#### Production Build
```bash
npm run build
```

#### Using Docker
```bash
# Build the Docker image
docker build -t tamerlane .

# Run with docker-compose
docker-compose up
```

## 🎯 Usage

### Loading IIIF Content

1. **Via URL Parameter**: 
   ```
   http://localhost:3000?iiif-content=https://example.com/manifest.json
   ```

2. **Via Interface**: Use the URL input dialog to load a manifest or collection

3. **Environment Variable**: Set `REACT_APP_IIIF_CONTENT_URL` for a default manifest

## 📦 Embedding

The simplest way to embed Tamerlane into any static HTML page is by using an `iframe`.

### Basic Iframe Embedding

Create an HTML file with the following content, and the viewer will be embedded directly into the page.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tamerlane Embedded Viewer</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    html, body { margin: 0; padding: 0; height: 100%; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <iframe 
    src="https://tamerlaneviewer.github.io/tamerlane/?iiif-content=https://iiif.wellcomecollection.org/presentation/b19974760"
    allowfullscreen
    allow="clipboard-write"
  ></iframe>
</body>
</html>
```

You can replace the `iiif-content` URL with any IIIF manifest you wish to display.

## 💬 Feedback

Encountered a bug or have a feature request? Please [raise an issue](https://github.com/tamerlaneviewer/tamerlane/issues) on the GitHub repository.

## 📄 License

This project is licensed under the MIT License.

