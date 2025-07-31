import { parseResource } from './parser';
import * as resource from './resource';
import * as image from './image';
import { Maniiifest } from 'maniiifest';
import { TamerlaneParseError } from '../errors';

// Mock dependencies
jest.mock('./resource');
jest.mock('./image');
jest.mock('maniiifest');

const mockFetchResource = resource.fetchResource as jest.Mock;
const mockGetImage = image.getImage as jest.Mock;
const mockManiiifest = Maniiifest as jest.Mock;

describe('parseResource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console logs for cleaner test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should parse a single manifest resource correctly', async () => {
    // Arrange
    const mockManifestData = {
      id: 'manifest-url',
      type: 'Manifest',
      label: { en: ['Test Manifest'] },
    };
    mockFetchResource.mockResolvedValue({ type: 'Manifest', data: mockManifestData });
    mockGetImage.mockReturnValue({ imageUrl: 'image-url', imageType: 'iiif' });

    mockManiiifest.mockImplementation(() => ({
      getSpecificationType: () => 'Manifest',
      getManifestLabel: () => ({ en: ['Test Manifest'] }),
      iterateManifestMetadata: () => [],
      iterateManifestProvider: () => [],
      iterateManifestHomepage: () => [],
      getManifestRequiredStatement: () => null,
      iterateManifestCanvas: () => [{ id: 'canvas1' }],
      iterateManifestCanvasAnnotation: () => [{ id: 'anno1' }],
      iterateAnnotationTarget: () => ['canvas1'],
      iterateAnnotationResourceBody: () => [{ id: 'image1' }],
      getManifestService: () => null,
    }));

    // Act
    const result = await parseResource('manifest-url');

    // Assert
    expect(mockFetchResource).toHaveBeenCalledWith('manifest-url');
    expect(result.firstManifest).toBeDefined();
    expect(result.firstManifest?.info.name).toBe('Test Manifest');
    expect(result.manifestUrls).toEqual(['manifest-url']);
    expect(result.total).toBe(1);
    expect(result.collection).toBeUndefined();
  });

  it('should parse a collection resource correctly', async () => {
    // Arrange
    const mockManifestData = { id: 'manifest-url', type: 'Manifest', label: { en: ['Test Manifest'] } };
    const mockCollectionData = { id: 'collection-url', type: 'Collection', label: { en: ['Test Collection'] }, items: [{ id: 'manifest-url', type: 'Manifest' }] };

    mockFetchResource
      .mockResolvedValueOnce({ type: 'Collection', data: mockCollectionData })
      .mockResolvedValueOnce({ type: 'Manifest', data: mockManifestData });

    mockManiiifest.mockImplementation((data: any) => {
      if (data.type === 'Collection') {
        return {
          getSpecificationType: () => 'Collection',
          getCollectionLabel: () => ({ en: ['Test Collection'] }),
          iterateCollectionMetadata: () => [],
          iterateCollectionProvider: () => [],
          iterateCollectionHomepage: () => [],
          getCollectionRequiredStatement: () => null,
          getCollectionService: () => null,
          iterateCollectionManifest: () => [{ id: 'manifest-url', type: 'Manifest' }],
          iterateCollectionCollection: () => [],
        };
      }
      return { // Mock for Manifest
        getSpecificationType: () => 'Manifest',
        getManifestId: () => data.id,
        getManifestLabel: () => ({ en: ['Test Manifest'] }),
        iterateManifestMetadata: () => [],
        iterateManifestProvider: () => [],
        iterateManifestHomepage: () => [],
        getManifestRequiredStatement: () => null,
        iterateManifestCanvas: () => [],
        iterateManifestCanvasAnnotation: () => [],
        getManifestService: () => null,
      };
    });

    // Act
    const result = await parseResource('collection-url');

    // Assert
    expect(mockFetchResource).toHaveBeenCalledTimes(2);
    expect(result.firstManifest).toBeDefined();
    expect(result.manifestUrls).toEqual(['manifest-url']);
    expect(result.total).toBe(1);
    expect(result.collection).toBeDefined();
    expect(result.collection?.info.name).toBe('Test Collection');
  });

  it('should throw an error for an unknown resource type', async () => {
    // Arrange
    mockFetchResource.mockResolvedValue({ type: 'Unknown', data: {} });

    // Act & Assert
    await expect(parseResource('unknown-url')).rejects.toThrow(
      new TamerlaneParseError('Unknown IIIF resource type')
    );
  });
});
