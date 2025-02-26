import { Maniiifest } from 'maniiifest';
import { IIIFResource, IIIFManifest, IIIFImage, IIIFCanvas } from '../types/index.ts';
import { TamerlaneResourceError, TamerlaneNetworkError, TamerlaneParseError } from '../errors/index.ts';

const manifestCache = new Map<string, IIIFManifest>(); // ✅ Caching fetched manifests

export function getCanvasDimensions(manifest: IIIFManifest, canvasId: string): { canvasWidth: number; canvasHeight: number } {
    const canvas = manifest.canvases.find(c => c.id === canvasId);
    if (!canvas) {
        throw new TamerlaneParseError(`Canvas with ID ${canvasId} not found.`);
    }
    return {
        canvasWidth: canvas.canvasWidth ?? 1000,
        canvasHeight: canvas.canvasHeight ?? 1000
    };
}

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

    return { imageUrl: url, imageType: type, imageWidth, imageHeight, canvasTarget };
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
            const image = getImage(resourceBody, canvasTarget);
            images.push(image);
        }
    }

    return { name: label, canvases, images };
}

async function parseCollection(jsonData: any): Promise<{ firstManifest: IIIFManifest | null, manifestUrls: string[], total: number }> {
    const parser = new Maniiifest(jsonData);
    
    if (parser.getSpecificationType() !== 'Collection') {
        throw new TamerlaneParseError('Invalid IIIF resource type: Collection expected');
    }
    const manifestUrls: string[] = [];
    let firstManifest: IIIFManifest | null = null;

    async function process(parsedJson: any, processedCollections: Set<string>) {
        if (processedCollections.has(parsedJson.id)) return; 
        processedCollections.add(parsedJson.id); 

        const parser = new Maniiifest(parsedJson);
        let foundManifests = false;

        for (const manifestItem of parser.iterateCollectionManifest()) {
            const manifestRef = new Maniiifest(manifestItem);
            const manifestId = manifestRef.getManifestId();

            if (manifestId) {
                manifestUrls.push(manifestId);
                foundManifests = true;

                if (!firstManifest) {
                    if (manifestCache.has(manifestId)) {
                        firstManifest = manifestCache.get(manifestId)!;
                    } else {
                        const manifestResource = await fetchResource(manifestId);
                        firstManifest = parseManifest(manifestResource.data);
                        manifestCache.set(manifestId, firstManifest);
                    }
                }
            }
        }
        if (!foundManifests) {
            for (const collectionItem of parser.iterateCollectionCollection()) {
                if (collectionItem.items) {
                    await process(collectionItem, processedCollections);
                } else {
                    const nestedJson = await fetchResource(collectionItem.id);
                    await process(nestedJson.data, processedCollections);
                }
            }
        }
    }
    await process(jsonData, new Set()); 
    return { firstManifest, manifestUrls, total: manifestUrls.length };
}


async function fetchManifest(manifestId: string): Promise<IIIFManifest> {
    if (manifestCache.has(manifestId)) {
        return manifestCache.get(manifestId)!;
    }

    const manifestResource = await fetchResource(manifestId);
    const parsedManifest = parseManifest(manifestResource.data);
    manifestCache.set(manifestId, parsedManifest);
    return parsedManifest;
}

export async function constructManifests(url: string): Promise<{ firstManifest: IIIFManifest | null, manifestUrls: string[], total: number }> {
    const resource = await fetchResource(url);

    if (resource.type === "Manifest") {
        const parsedManifest = parseManifest(resource.data);
        return { firstManifest: parsedManifest, manifestUrls: [], total: 1 };
    } else if (resource.type === "Collection") {
        const { firstManifest, manifestUrls, total } = await parseCollection(resource.data);

        if (manifestUrls.length === 0) {
            return { firstManifest: null, manifestUrls: [], total: 0 };
        }

        if (!firstManifest && manifestUrls.length > 0) {
            const firstFetchedManifest = await fetchManifest(manifestUrls[0]);
            return { firstManifest: firstFetchedManifest, manifestUrls, total };
        }

        return { firstManifest, manifestUrls, total };
    }

    throw new TamerlaneParseError("Unknown IIIF resource type");
}

