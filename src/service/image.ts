import { IIIFImage } from '../types/index.ts';
import { TamerlaneParseError } from '../errors/index.ts';

/**
 * Extracts a IIIF image service URL or direct image URL from a resource.
 * Handles both IIIF Presentation v2 and v3, including fallback and error handling.
 */
export function getImage(resource: any, canvasTarget: string): IIIFImage {
  let url: string | undefined;
  let type: 'standard' | 'iiif' = 'standard';
  let imageWidth: number | undefined;
  let imageHeight: number | undefined;

  // Attempt to extract IIIF image service from `service` array
  const services = Array.isArray(resource.service)
    ? resource.service
    : resource.service
      ? [resource.service]
      : [];

  const iiifService = services.find((s: any) =>
    s.type === 'ImageService3' ||
    s['@type'] === 'ImageService2' ||
    (typeof s.profile === 'string' && s.profile.includes('iiif.io/api/image')) ||
    (Array.isArray(s.profile) && s.profile.some((p: string) => p.includes('iiif.io/api/image')))
  );

  if (iiifService) {
    url = iiifService.id || iiifService['@id'];
    imageWidth = iiifService.width ?? resource.width;
    imageHeight = iiifService.height ?? resource.height;
    type = 'iiif';

    if (url && !url.endsWith('/')) {
      url += '/';
    }

    if (
      typeof iiifService.profile === 'string' &&
      !iiifService.profile.includes('iiif.io/api/image')
    ) {
      console.warn(
        `⚠️ Unusual profile format: "${iiifService.profile}". This may cause issues with some viewers (e.g., OpenSeadragon).`
      );
    }
  }

  // Fallback to resource.id if no IIIF service
  if (!url && typeof resource.id === 'string') {
    url = resource.id;
    type = 'standard';
    imageWidth = resource.width;
    imageHeight = resource.height;
  }

  // Fallback to annotation body
  if (!url && resource.body && typeof resource.body.id === 'string') {
    url = resource.body.id;
    type = resource.body.service ? 'iiif' : 'standard';
    imageWidth = resource.body.width;
    imageHeight = resource.body.height;
  }

  if (!url) {
    throw new TamerlaneParseError('Unable to get image resource id.');
  }

  // Avoid using direct image URLs as IIIF tile sources
  if (type === 'standard' && /\.(jpg|jpeg|png|gif)$/i.test(url)) {
    console.warn(`⚠️ Fallback to static image URL: ${url}. Tiling and zooming may be unavailable.`);
  }

  // Force HTTPS to prevent mixed content errors
  if (url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
  }

  return {
    imageUrl: url,
    imageType: type,
    imageWidth,
    imageHeight,
    canvasTarget,
  };
}
