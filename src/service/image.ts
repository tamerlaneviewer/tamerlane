import { IIIFImage } from '../types/index.ts';
import { TamerlaneParseError } from '../errors/index.ts';

export function getImage(resource: any, canvasTarget: string): IIIFImage {
  let url: string | undefined;
  let type: 'standard' | 'iiif' = 'standard';
  let imageWidth: number | undefined;
  let imageHeight: number | undefined;

  if (
    resource.service &&
    Array.isArray(resource.service) &&
    resource.service.length > 0
  ) {
    const service = resource.service[0];
    url =
      typeof service.id === 'string'
        ? service.id
        : typeof service['@id'] === 'string'
          ? service['@id']
          : undefined;
    imageWidth = service.width ?? resource.width;
    imageHeight = service.height ?? resource.height;
    type = 'iiif';
  }
  if (!url && typeof resource.id === 'string') {
    url = resource.id;
    type = 'standard';
    if (resource.width && resource.height) {
      imageWidth = resource.width;
      imageHeight = resource.height;
    }
  }
  if (!url) {
    throw new TamerlaneParseError('Unable to get image resource id.');
  }
  //console.log(`Found image: ${url} with type: ${type} and dimensions: ${imageWidth}x${imageHeight}`);
  return {
    imageUrl: url,
    imageType: type,
    imageWidth,
    imageHeight,
    canvasTarget,
  };
}
