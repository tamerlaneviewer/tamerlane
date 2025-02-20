import { Maniiifest } from 'maniiifest';
import { IIIFResource, IIIFManifest, IIIFImage, IIIFCanvas } from '../types/index.ts';
import { TamerlaneResourceError, TamerlaneNetworkError, TamerlaneParseError } from '../errors/index.ts';

async function fetchResource(url: string): Promise<IIIFResource> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new TamerlaneNetworkError(`HTTP error! status: ${response.status}`);
        }
        const data: any = await response.json();

        if (data.type !== "Manifest" && data.type !== "Collection") {
            throw new TamerlaneParseError(`Invalid IIIF resource type: ${data.type}`);
        }

        return { type: data.type, data };
    } catch (error) {
        console.error('Error fetching IIIF resource:', error);
        throw new TamerlaneResourceError('Error fetching IIIF resource');
    }
}

function getImage(resource: any, canvasTarget: string): IIIFImage {
    let url: string | undefined;
    let type: "standard" | "iiif" = "standard";
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;

    if (resource.service && Array.isArray(resource.service) && resource.service.length > 0) {
        const service = resource.service[0];
        url = typeof service.id === 'string' ? service.id 
            : typeof service["@id"] === 'string' ? service["@id"]
            : undefined;
        type = "iiif";
    } 
    if (!url && typeof resource.id === 'string') {
        url = resource.id;
        type = "standard";
    }
    if (!url) {
        throw new TamerlaneParseError("Unable to get image resource id.");
    }

    if (resource.width && resource.height) {
        imageWidth = resource.width;
        imageHeight = resource.height;
    }

    return { imageUrl: url, imageType: type , imageWidth, imageHeight, canvasTarget };
}


function parseManifest(jsonData: any): IIIFManifest {
    const parser = new Maniiifest(jsonData);
    const type = parser.getSpecificationType();

    if (type !== 'Manifest') {
        throw new TamerlaneParseError('Invalid IIIF resource type: ' + type);
    }

    const labelData: any = parser.getManifestLabelByLanguage('en');
    const label: string = labelData?.en?.[0] ?? '';

    const canvases: IIIFCanvas[] = [];
    for (const canvas of parser.iterateManifestCanvas()) {
        const id = canvas.id;
        const canvasHeight = canvas.height;
        const canvasWidth = canvas.width;
        canvases.push({ id, canvasWidth, canvasHeight });
    }

    const images: IIIFImage[] = [];
    for (const anno of parser.iterateManifestCanvasAnnotation()) {
        const annoParser = new Maniiifest(anno, "Annotation");
        const targets = Array.from(annoParser.iterateAnnotationTarget());
        if (targets.length !== 1) {
            throw new TamerlaneParseError("Expected a single canvas target");
        }
        const canvasTarget = targets[0];
        if (typeof canvasTarget !== 'string') {
            throw new TamerlaneParseError("Expected canvas target to be a string");
        }

        for (const resourceBody of annoParser.iterateAnnotationResourceBody()) {
            const image = getImage(resourceBody, canvasTarget)
            images.push(image);
        }
    }

    return { name: label, canvases, images };
}

async function parseResource(resource: IIIFResource): Promise<IIIFManifest[]> {
    if (resource.type === "Manifest") {
        const manifestData = parseManifest(resource.data);
        return [manifestData]; // Return as an array
    } else if (resource.type === "Collection") {
        console.log("Not implemented yet")
        return [];
    }
    return [];
}


export async function constructManifests(url: string): Promise<IIIFManifest[]> {
    const resource = await fetchResource(url);
    return await parseResource(resource);
}

//const exampleUrl = 'https://gist.githubusercontent.com/jptmoore/b67cb149bbd11590022db9178cd23843/raw/60828ef3fb7b4cf2dc8ed9ecdd41869296bdf596/copy1.json';

// const exampleUrl = "https://iiif.io/api/cookbook/recipe/0001-mvm-image/manifest.json";

// constructManifests(exampleUrl).then((manifests) => {
//     console.log(JSON.stringify(manifests, null, 2));

// });

