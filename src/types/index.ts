export interface IIIFResource {
  type: string;
  data: any;
}

export interface IIIFAnnotation {
  id: string;
  motivation: string | string[];
  target: string;
  body: { value?: string }[];
}

export interface IIIFSearchSnippet {
  id: string;
  annotationId: string;
  motivation: string;
  prefix?: string;
  exact: string;
  suffix?: string;
  canvasTarget: string;
  partOf?: string;
}

export interface IIIFCanvas {
  id: string;
  canvasWidth?: number;
  canvasHeight?: number;
}

export interface IIIFImage {
  imageUrl: string;
  imageType: 'standard' | 'iiif';
  imageWidth?: number;
  imageHeight?: number;
  canvasTarget: string;
}

export interface IIIFManifest {
  name: string;
  metadata?: Array<{ label: any; value: any }>;
  provider?: Array<{
    id?: string;
    type?: string;
    label?: any;
    homepage?: any;
    logo?: any;
  }>;
  canvases: IIIFCanvas[];
  images: IIIFImage[];
  manifestSearch?: { service: string; autocomplete?: string };
}

export interface IIIFCollection {
  name: string;
  metadata?: Array<{ label: any; value: any }>;
  provider?: Array<{
    id?: string;
    type?: string;
    label?: any;
    homepage?: any;
    logo?: any;
  }>;
  collectionSearch?: { service: string; autocomplete?: string };
}

export interface TamerlaneResource {
  firstManifest: IIIFManifest | null;
  manifestUrls: string[];
  total: number;
  collection?: IIIFCollection;
}
