import { Maniiifest } from 'maniiifest';

interface IIIFResource {
    type: string;
    data: any;
}

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

function parseManifest(jsonData: any) {
    const parser = new Maniiifest(jsonData);
    const type = parser.getSpecificationType();

    if (type !== 'Manifest') {
        throw new Error('Invalid IIIF resource type: ' + type);
    }

    // Extract label
    const labelData: any = parser.getManifestLabelByLanguage('en');
    const label: string = labelData?.en?.[0] ?? ''; 

    // Extract images from annotations
    const images: string[] = [];
    for (const anno of parser.iterateManifestCanvasAnnotation()) {
        if (anno.body && (anno.body as any).id) {
            images.push((anno.body as any).id as string);
        } else {
            console.warn('Warning: No image found in annotation.');
        }
    }

    return { name: label, images };
}

async function parseResource(resource: IIIFResource) {
    if (resource.type === "Manifest") {
        // Handle single manifest
        const manifestData = parseManifest(resource.data);
        return [manifestData]; // Return as an array
    } else if (resource.type === "Collection") {
        // Handle collection (Multiple Manifests)
        const collectionData = resource.data;
        if (!collectionData.items) {
            throw new Error("Invalid IIIF Collection: No items found.");
        }

        // Iterate through collection and parse each manifest
        const manifests: { name: string; images: string[] }[] = [];
        for (const item of collectionData.items) {
            if (item.type === "Manifest") {
                const manifestResource = await fetchResource(item.id);
                const result = parseManifest(manifestResource.data);
                manifests.push(result as any);
            }
        }
        return manifests;
    }
    return [];
}


export async function constructManifests(url: string) {
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

