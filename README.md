# Tamerlane

A lightweight IIIF (International Image Interoperability Framework) viewer designed to make viewing, navigating, and searching annotated IIIF Presentation 3.0 resources simple and intuitive.

![Screenshot of Tamerlane](assets/screenshot.png)

The goal of Tamerlane is not to be a feature-rich viewer but rather to focus on providing a good user experience for annotated resources. 

## 🎬 Demo

A live demo of the viewer is available, loaded with a content from the Wellcome Collection. Please note, search is only available for Content Search 2.0 endpoints: 
[**The chemist and the druggist**](https://jptmoore.github.io/tamerlane/?iiif-content=https://iiif.wellcomecollection.org/presentation/b19974760)

## ✨ Features

- **Collection Navigation**: Browse through IIIF collections
- **Annotation Management**: View and navigate annotations
- **Search Functionality**: Full-text search across collections
- **Responsive Design**: Modern UI built with Tailwind CSS

## 🚀 Getting Started

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
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
    src="https://jptmoore.github.io/tamerlane/?iiif-content=https://iiif.wellcomecollection.org/presentation/b19974760"
    allowfullscreen
    allow="clipboard-write"
  ></iframe>
</body>
</html>
```

You can replace the `iiif-content` URL with any IIIF manifest you wish to display.

## 📄 License

This project is licensed under the MIT License.

