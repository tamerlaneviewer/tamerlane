export interface IIIFResource {
    type: string;
    data: any;
}

export interface IIIFImage {
    imageUrl: string;
    imageType: "standard" | "iiif";
}

export interface IIIFManifest {
    name: string;
    images: IIIFImage[];
}