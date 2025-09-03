import { searchAnnotations } from './search';
import * as resource from './resource';
import { Maniiifest } from 'maniiifest';

// Mock the dependencies
jest.mock('./resource');
jest.mock('maniiifest');
jest.mock('../config/appConfig.ts', () => ({
  maxSearchPages: 2, // Limit for testing
}));

const mockFetchResource = resource.fetchResource as jest.Mock;
const mockManiiifest = Maniiifest as jest.Mock;

describe('searchAnnotations', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console output for clean test results
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  const MOCK_URL = 'https://example.com/annotations.json';

  it('should fetch and process a single page of annotations correctly', async () => {
    // Arrange: Mock data for a single annotation page
    const mockAnnotationPage = {
      type: 'AnnotationPage',
      id: MOCK_URL,
      items: [
        { id: 'http://example.org/anno/1', type: 'Annotation', target: { id: 'http://example.org/canvas/1' } },
      ],
      annotations: [
        {
          type: 'AnnotationPage',
          items: [
            {
              id: 'http://example.org/anno/2',
              type: 'Annotation',
              motivation: 'highlighting',
              target: {
                source: 'http://example.org/anno/1',
                selector: [
                  {
                    type: 'TextQuoteSelector',
                    prefix: '... for a ',
                    exact: 'test',
                    suffix: ' case ...',
                  },
                ],
              },
            },
          ],
        },
      ],
      next: null, // No next page
    };

    mockFetchResource.mockResolvedValue({
      type: 'AnnotationPage',
      data: mockAnnotationPage,
    });

    // Mock Maniiifest behavior
    mockManiiifest.mockImplementation((data, type) => {
      if (type === 'AnnotationPage' && data.id === MOCK_URL) { // Top-level page
        return {
          iterateAnnotationPageAnnotation: () => mockAnnotationPage.items,
          getAnnotationPage: () => ({ next: null }),
        };
      }
      if (type === 'AnnotationPage' && data.items) { // Nested page
        return {
          iterateAnnotationPageAnnotation: () => data.items,
        };
      }
      return { // Default mock
          iterateAnnotationPageAnnotation: () => [],
          getAnnotationPage: () => ({ next: null }),
      };
    });


    // Act
    const snippets = await searchAnnotations(MOCK_URL);

    // Assert
  // Called with URL and options object (signal / timeout)
  expect(mockFetchResource).toHaveBeenCalledWith(MOCK_URL, expect.any(Object));
    expect(mockFetchResource).toHaveBeenCalledTimes(1);
    expect(snippets).toHaveLength(1);
    expect(snippets[0]).toEqual({
      id: 'http://example.org/anno/2',
      annotationId: 'http://example.org/anno/1',
      motivation: 'highlighting',
      prefix: '... for a ',
      exact: 'test',
      suffix: ' case ...',
      canvasTarget: 'http://example.org/canvas/1',
      partOf: undefined,
      language: undefined,
    });
  });

  it('should return a structured error for invalid resource type', async () => {
    // Arrange
    mockFetchResource.mockResolvedValue({
      type: 'Manifest', // Invalid type
      data: {},
    });

    // Act & Assert
    await expect(searchAnnotations(MOCK_URL)).rejects.toMatchObject({
      code: 'NETWORK_SEARCH_FETCH',
      message: `Invalid or empty response received from ${MOCK_URL}`,
    });
  });

  it('should handle multiple pages of annotations', async () => {
        // Arrange
        const MOCK_URL_PAGE1 = 'https://example.com/page1.json';
        const MOCK_URL_PAGE2 = 'https://example.com/page2.json';

        const mockPage1 = {
            type: 'AnnotationPage',
            id: MOCK_URL_PAGE1,
            items: [{ id: 'anno1', type: 'Annotation', target: { id: 'canvas1' } }],
            annotations: [{ type: 'AnnotationPage', items: [{ id: 'snippet1', type: 'Annotation', motivation: 'highlighting', target: { source: 'anno1', selector: [{ type: 'TextQuoteSelector', exact: 'text1' }] } }] }],
            next: MOCK_URL_PAGE2,
        };

        const mockPage2 = {
            type: 'AnnotationPage',
            id: MOCK_URL_PAGE2,
            items: [{ id: 'anno2', type: 'Annotation', target: { id: 'canvas2' } }],
            annotations: [{ type: 'AnnotationPage', items: [{ id: 'snippet2', type: 'Annotation', motivation: 'highlighting', target: { source: 'anno2', selector: [{ type: 'TextQuoteSelector', exact: 'text2' }] } }] }],
            next: null,
        };

        mockFetchResource
            .mockResolvedValueOnce({ type: 'AnnotationPage', data: mockPage1 })
            .mockResolvedValueOnce({ type: 'AnnotationPage', data: mockPage2 });

        mockManiiifest.mockImplementation((data) => {
            if (data.id === MOCK_URL_PAGE1) {
                return {
                    iterateAnnotationPageAnnotation: () => mockPage1.items,
                    getAnnotationPage: () => ({ next: mockPage1.next }),
                };
            }
            if (data.id === MOCK_URL_PAGE2) {
                return {
                    iterateAnnotationPageAnnotation: () => mockPage2.items,
                    getAnnotationPage: () => ({ next: mockPage2.next }),
                };
            }
             if (data.items) { // Nested page
                return {
                    iterateAnnotationPageAnnotation: () => data.items,
                };
            }
            return { iterateAnnotationPageAnnotation: () => [], getAnnotationPage: () => ({ next: null }) };
        });

        // Act
        const snippets = await searchAnnotations(MOCK_URL_PAGE1);

        // Assert
        expect(mockFetchResource).toHaveBeenCalledTimes(2);
  expect(mockFetchResource).toHaveBeenCalledWith(MOCK_URL_PAGE1, expect.any(Object));
  expect(mockFetchResource).toHaveBeenCalledWith(MOCK_URL_PAGE2, expect.any(Object));
        expect(snippets).toHaveLength(2);
        expect(snippets[0].exact).toBe('text1');
        expect(snippets[1].exact).toBe('text2');
    });

  it('should handle contextualizing motivation in addition to highlighting', async () => {
    // Arrange: Mock data with contextualizing motivation
    const mockAnnotationPage = {
      type: 'AnnotationPage',
      id: MOCK_URL,
      items: [
        { id: 'http://example.org/anno/1', type: 'Annotation', target: { id: 'http://example.org/canvas/1' } },
      ],
      annotations: [
        {
          type: 'AnnotationPage',
          items: [
            {
              id: 'http://example.org/anno/contextual',
              type: 'Annotation',
              motivation: 'contextualizing',
              target: {
                source: 'http://example.org/anno/1',
                selector: [
                  {
                    type: 'TextQuoteSelector',
                    prefix: 'There are two ',
                    exact: 'birds',
                    suffix: ' in the bush',
                  },
                ],
              },
            },
          ],
        },
      ],
      next: null,
    };

    mockFetchResource.mockResolvedValue({
      type: 'AnnotationPage',
      data: mockAnnotationPage,
    });

    mockManiiifest.mockImplementation((data, type) => {
      if (type === 'AnnotationPage' && data.id === MOCK_URL) {
        return {
          iterateAnnotationPageAnnotation: () => mockAnnotationPage.items,
          getAnnotationPage: () => ({ next: null }),
        };
      }
      if (type === 'AnnotationPage' && data.items) {
        return {
          iterateAnnotationPageAnnotation: () => data.items,
        };
      }
      return {
        iterateAnnotationPageAnnotation: () => [],
        getAnnotationPage: () => ({ next: null }),
      };
    });

    // Act
    const snippets = await searchAnnotations(MOCK_URL);

    // Assert
    expect(snippets).toHaveLength(1);
    expect(snippets[0]).toEqual({
      id: 'http://example.org/anno/contextual',
      annotationId: 'http://example.org/anno/1',
      motivation: 'contextualizing',
      prefix: 'There are two ',
      exact: 'birds',
      suffix: ' in the bush',
      canvasTarget: 'http://example.org/canvas/1',
      partOf: undefined,
      language: undefined,
    });
  });

  it('should handle annotations with array targets (multi-match)', async () => {
    // Arrange: Mock data with array targets
    const mockAnnotationPage = {
      type: 'AnnotationPage',
      id: MOCK_URL,
      items: [
        { id: 'http://example.org/anno/hand', type: 'Annotation', target: { id: 'http://example.org/canvas/1#xywh=200,100,150,30' } },
        { id: 'http://example.org/anno/is', type: 'Annotation', target: { id: 'http://example.org/canvas/1#xywh=200,140,170,30' } },
      ],
      annotations: [
        {
          type: 'AnnotationPage',
          items: [
            {
              id: 'http://example.org/anno/multi-match',
              type: 'Annotation',
              motivation: 'highlighting',
              target: [
                {
                  source: 'http://example.org/anno/hand',
                  selector: [
                    {
                      type: 'TextQuoteSelector',
                      prefix: 'bird in the ',
                      exact: 'hand',
                    },
                  ],
                },
                {
                  source: 'http://example.org/anno/is',
                  selector: [
                    {
                      type: 'TextQuoteSelector',
                      exact: 'is',
                      suffix: ' worth two in the',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      next: null,
    };

    mockFetchResource.mockResolvedValue({
      type: 'AnnotationPage',
      data: mockAnnotationPage,
    });

    mockManiiifest.mockImplementation((data, type) => {
      if (type === 'AnnotationPage' && data.id === MOCK_URL) {
        return {
          iterateAnnotationPageAnnotation: () => mockAnnotationPage.items,
          getAnnotationPage: () => ({ next: null }),
        };
      }
      if (type === 'AnnotationPage' && data.items) {
        return {
          iterateAnnotationPageAnnotation: () => data.items,
        };
      }
      return {
        iterateAnnotationPageAnnotation: () => [],
        getAnnotationPage: () => ({ next: null }),
      };
    });

    // Act
    const snippets = await searchAnnotations(MOCK_URL);

    // Assert
    expect(snippets).toHaveLength(2); // Should create two snippets from array targets
    
    // First target
    expect(snippets[0]).toEqual({
      id: 'http://example.org/anno/multi-match',
      annotationId: 'http://example.org/anno/hand',
      motivation: 'highlighting',
      prefix: 'bird in the ',
      exact: 'hand',
      suffix: undefined,
      canvasTarget: 'http://example.org/canvas/1',
      partOf: undefined,
      language: undefined,
    });

    // Second target
    expect(snippets[1]).toEqual({
      id: 'http://example.org/anno/multi-match-1',
      annotationId: 'http://example.org/anno/is',
      motivation: 'highlighting',
      prefix: undefined,
      exact: 'is',
      suffix: ' worth two in the',
      canvasTarget: 'http://example.org/canvas/1',
      partOf: undefined,
      language: undefined,
    });
  });

  it('should handle mixed highlighting and contextualizing motivations', async () => {
    // Arrange: Mock data with both motivation types
    const mockAnnotationPage = {
      type: 'AnnotationPage',
      id: MOCK_URL,
      items: [
        { id: 'http://example.org/anno/1', type: 'Annotation', target: { id: 'http://example.org/canvas/1' } },
      ],
      annotations: [
        {
          type: 'AnnotationPage',
          items: [
            {
              id: 'http://example.org/anno/highlight',
              type: 'Annotation',
              motivation: 'highlighting',
              target: {
                source: 'http://example.org/anno/1',
                selector: [{ type: 'TextQuoteSelector', exact: 'highlight' }],
              },
            },
            {
              id: 'http://example.org/anno/context',
              type: 'Annotation',
              motivation: 'contextualizing',
              target: {
                source: 'http://example.org/anno/1',
                selector: [{ type: 'TextQuoteSelector', exact: 'context' }],
              },
            },
            {
              id: 'http://example.org/anno/other',
              type: 'Annotation',
              motivation: 'commenting', // Should be ignored
              target: {
                source: 'http://example.org/anno/1',
                selector: [{ type: 'TextQuoteSelector', exact: 'comment' }],
              },
            },
          ],
        },
      ],
      next: null,
    };

    mockFetchResource.mockResolvedValue({
      type: 'AnnotationPage',
      data: mockAnnotationPage,
    });

    mockManiiifest.mockImplementation((data, type) => {
      if (type === 'AnnotationPage' && data.id === MOCK_URL) {
        return {
          iterateAnnotationPageAnnotation: () => mockAnnotationPage.items,
          getAnnotationPage: () => ({ next: null }),
        };
      }
      if (type === 'AnnotationPage' && data.items) {
        return {
          iterateAnnotationPageAnnotation: () => data.items,
        };
      }
      return {
        iterateAnnotationPageAnnotation: () => [],
        getAnnotationPage: () => ({ next: null }),
      };
    });

    // Act
    const snippets = await searchAnnotations(MOCK_URL);

    // Assert
    expect(snippets).toHaveLength(2); // Only highlighting and contextualizing, not commenting
    expect(snippets.map(s => s.motivation)).toEqual(['highlighting', 'contextualizing']);
    expect(snippets.map(s => s.exact)).toEqual(['highlight', 'context']);
  });

  it('should handle array motivations with exact matching', async () => {
    // Arrange: Mock data with array motivations
    const mockAnnotationPage = {
      type: 'AnnotationPage',
      id: MOCK_URL,
      items: [
        { id: 'http://example.org/anno/1', type: 'Annotation', target: { id: 'http://example.org/canvas/1' } },
      ],
      annotations: [
        {
          type: 'AnnotationPage',
          items: [
            {
              id: 'http://example.org/anno/array-highlight',
              type: 'Annotation',
              motivation: ['highlighting', 'tagging'], // Array with highlighting (should match)
              target: {
                source: 'http://example.org/anno/1',
                selector: [{ type: 'TextQuoteSelector', exact: 'array-highlight' }],
              },
            },
            {
              id: 'http://example.org/anno/array-context',
              type: 'Annotation',
              motivation: ['contextualizing', 'supplementing'], // Array with contextualizing (should match)
              target: {
                source: 'http://example.org/anno/1',
                selector: [{ type: 'TextQuoteSelector', exact: 'array-context' }],
              },
            },
            {
              id: 'http://example.org/anno/array-both',
              type: 'Annotation',
              motivation: ['highlighting', 'contextualizing'], // Array with both (should match)
              target: {
                source: 'http://example.org/anno/1',
                selector: [{ type: 'TextQuoteSelector', exact: 'array-both' }],
              },
            },
            {
              id: 'http://example.org/anno/array-none',
              type: 'Annotation',
              motivation: ['painting', 'commenting'], // Array without search motivations (should not match)
              target: {
                source: 'http://example.org/anno/1',
                selector: [{ type: 'TextQuoteSelector', exact: 'array-none' }],
              },
            },
            {
              id: 'http://example.org/anno/array-compound',
              type: 'Annotation',
              motivation: ['supplementing highlighting', 'tagging'], // Array with compound motivation (should not match with exact matching)
              target: {
                source: 'http://example.org/anno/1',
                selector: [{ type: 'TextQuoteSelector', exact: 'array-compound' }],
              },
            },
          ],
        },
      ],
      next: null,
    };

    mockFetchResource.mockResolvedValue({
      type: 'AnnotationPage',
      data: mockAnnotationPage,
    });

    mockManiiifest.mockImplementation((data, type) => {
      if (type === 'AnnotationPage' && data.id === MOCK_URL) {
        return {
          iterateAnnotationPageAnnotation: () => mockAnnotationPage.items,
          getAnnotationPage: () => ({ next: null }),
        };
      }
      if (type === 'AnnotationPage' && data.items) {
        return {
          iterateAnnotationPageAnnotation: () => data.items,
        };
      }
      return {
        iterateAnnotationPageAnnotation: () => [],
        getAnnotationPage: () => ({ next: null }),
      };
    });

    // Act
    const snippets = await searchAnnotations(MOCK_URL);

    // Assert
    expect(snippets).toHaveLength(3); // Only exact matches for highlighting/contextualizing
    expect(snippets.map(s => s.exact)).toEqual(['array-highlight', 'array-context', 'array-both']);
    
    // Verify that non-search motivations and compound motivations are ignored
    expect(snippets.some(s => s.exact === 'array-none')).toBe(false);
    expect(snippets.some(s => s.exact === 'array-compound')).toBe(false);
    
    // Verify motivation strings are properly joined for arrays
    expect(snippets[0].motivation).toBe('highlighting, tagging');
    expect(snippets[1].motivation).toBe('contextualizing, supplementing');
    expect(snippets[2].motivation).toBe('highlighting, contextualizing');
  });

});
