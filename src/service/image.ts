import { IIIFImage } from '../types/index.ts';
import { TamerlaneParseError } from '../errors/index.ts';
import { IIIFImageResource } from '../types/index.ts';

// --- Constants for IIIF types and profiles ---
const IIIF_IMAGE_SERVICE_3 = 'ImageService3';
const IIIF_IMAGE_SERVICE_2 = 'ImageService2';
const IIIF_IMAGE_API_MARKER = 'iiif.io/api/image';


/**
 * Ensures the IIIF image service URL is safe and normalized for OpenSeadragon.
 * Always appends /info.json as required by IIIF Image API specification.
 */
function normalizeIiifUrl(baseUrl: string): string {
  const safeBase = baseUrl.replace(/\/+$/, '');
  // Check if /info.json is already present to avoid double-appending
  if (safeBase.endsWith('/info.json')) {
    return safeBase;
  }
  // IIIF spec requires /info.json suffix for Image Service metadata requests
  return `${safeBase}/info.json`;
}

/**
 * Finds a IIIF image service within a resource's service list.
 */
function findIiifService(resource: IIIFImageResource): any | undefined {
  const services = Array.isArray(resource.service)
    ? resource.service
    : resource.service ? [resource.service] : [];

  return services.find((s: any) => {
    if (!s) return false;
    const profile = s.profile;
    return (
      s.type === IIIF_IMAGE_SERVICE_3 ||
      s['@type'] === IIIF_IMAGE_SERVICE_2 ||
      (typeof profile === 'string' && profile.includes(IIIF_IMAGE_API_MARKER)) ||
      (Array.isArray(profile) && profile.some((p: string) => typeof p === 'string' && p.includes(IIIF_IMAGE_API_MARKER)))
    );
  });
}

/**
 * Extracts a IIIF image service URL or direct image URL from a resource.
 * Handles both IIIF Presentation v2 and v3, including fallback and error handling.
 */
export function getImage(resource: IIIFImageResource, canvasTarget: string): IIIFImage {
  let url: string | undefined;
  let type: 'standard' | 'iiif' = 'standard';
  let imageWidth: number | undefined;
  let imageHeight: number | undefined;

  const iiifService = findIiifService(resource);

  if (iiifService) {
    let baseUrl = iiifService.id || iiifService['@id'];
    if (baseUrl) {
      url = normalizeIiifUrl(baseUrl);
    }
    imageWidth = iiifService.width ?? resource.width;
    imageHeight = iiifService.height ?? resource.height;
    type = 'iiif';
  } else {
    // Fallback to resource.id or resource.body.id
    if (typeof resource.id === 'string') {
      url = resource.id;
      imageWidth = resource.width;
      imageHeight = resource.height;
    } else if (resource.body && typeof resource.body.id === 'string') {
      url = resource.body.id;
      imageWidth = resource.body.width;
      imageHeight = resource.body.height;

      // Check if the body itself has a service
      if (findIiifService(resource.body)) {
        type = 'iiif';
      }
    }
  }

  if (!url) {
    throw new TamerlaneParseError('Unable to get image resource id.');
  }

  return {
    imageUrl: url,
    imageType: type,
    imageWidth,
    imageHeight,
    canvasTarget,
  };
}
