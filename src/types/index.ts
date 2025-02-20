export interface IIIFResource {
    type: string;
    data: any;
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
    canvases: IIIFCanvas[];
    images: IIIFImage[];
}