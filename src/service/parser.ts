import { Maniiifest } from 'maniiifest';
import { IIIFResource, IIIFManifest, IIIFImage } from '../types';

async function fetchResource(url: string): Promise<IIIFResource> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: any = await response.json();

        if (data.type !== "Manifest" && data.type !== "Collection") {
            throw new Error(`Invalid IIIF resource type: ${data.type}`);
        }

        return { type: data.type, data };
    } catch (error) {
        console.error('Error fetching IIIF resource:', error);
        throw error;
    }
}

function getImage(resource: any): IIIFImage {
    let url: string;
    let type: "standard" | "iiif";

    if (resource.service && Array.isArray(resource.service)) {
        if (resource.service.length > 0 && typeof resource.service[0].id === 'string') {
            url = resource.service[0].id;
            type = "iiif";
        } else {
            throw new Error('Invalid resource array: No valid id found in the first object.');
        }
    } else if (typeof resource.id === 'string') {
        url = resource.id;
        type = "standard";
    } else {
        throw new Error('Invalid resource: No valid id found.');
    }

    return { imageUrl: url, imageType: type };
}

function parseManifest(jsonData: any): IIIFManifest {
    const parser = new Maniiifest(jsonData);
    const type = parser.getSpecificationType();

    if (type !== 'Manifest') {
        throw new Error('Invalid IIIF resource type: ' + type);
    }

    const labelData: any = parser.getManifestLabelByLanguage('en');
    const label: string = labelData?.en?.[0] ?? '';

    const images: IIIFImage[] = [];
    for (const anno of parser.iterateManifestCanvasAnnotation()) {
        const annoParser = new Maniiifest(anno, "Annotation");
        for (const resourceBody of annoParser.iterateAnnotationResourceBody()) {
            const image = getImage(resourceBody)
            images.push(image);
        }
    }

    return { name: label, images };
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
    try {
        const resource = await fetchResource(url);
        return await parseResource(resource);
    } catch (error) {
        console.error("Error constructing manifests:", error);
        return [];
    }
}


// const exampleUrl = 'https://gist.githubusercontent.com/jptmoore/b67cb149bbd11590022db9178cd23843/raw/60828ef3fb7b4cf2dc8ed9ecdd41869296bdf596/copy1.json';

// constructManifests(exampleUrl).then((manifests) => {
//     console.log(manifests);
// });

