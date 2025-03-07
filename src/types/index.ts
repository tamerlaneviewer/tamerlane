export interface IIIFResource {
    type: string;
    data: any;
}

export interface AnnotationText {
    id: string;
    motivation: string | string[];
    target: string;
    body: any[];
  };

export interface W3CAnnotation {
    id: string,
    motivation?: string,
    text?: string
    format?: string,
    language?: string
}

export interface IIIFCanvas {
    id: string;
    canvasWidth?: number;
    canvasHeight?: number;
}

export interface IIIFImage {
    imageUrl: string;
    imageType: "standard" | "iiif";
    imageWidth?: number;
    imageHeight?: number;
    canvasTarget: string;
}

export interface IIIFManifest {
    name: string;
    metadata?: Array<{ label: any; value: any }>; 
    provider?: Array<{ id?: string; type?: string; label?: any; homepage?: any; logo?: any }>; 
    canvases: IIIFCanvas[];
    images: IIIFImage[];
}
