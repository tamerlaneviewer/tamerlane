# Tamerlane

A lightweight IIIF (International Image Interoperability Framework) viewer designed to make viewing, navigating, and searching annotated IIIF Presentation 3.0 resources simpler and more intuitive.

## ✨ Features

- **Collection Navigation**: Browse through IIIF collections
- **Annotation Management**: View and navigate annotations
- **Search Functionality**: Full-text search across annotations
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

### Navigation

- **Collections**: Browse available manifests in the left panel
- **Canvas Navigation**: Use controls to move between images in a manifest
- **Annotations**: View and search annotations in the right panel
- **Zoom & Pan**: Use mouse/touch controls for detailed viewing

## 📄 License

This project is licensed under the MIT License.

