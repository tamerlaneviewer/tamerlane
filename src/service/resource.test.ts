import { TamerlaneResourceError } from '../errors/index.ts';

const TEST_URL = 'https://example.com/iiif/manifest.json';

describe('fetchResource', () => {
  let fetchResource: (url: string) => Promise<any>;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    // @ts-ignore
    global.fetch = jest.fn();
    // Re-import the module to get a fresh instance with a clear cache
    fetchResource = require('./resource').fetchResource;

    // Suppress console.log and console.error for all tests in this suite
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original console methods
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('fetches and returns a valid IIIF Manifest resource', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ type: 'Manifest', foo: 'bar' }),
    });

    const result = await fetchResource(TEST_URL);
    expect(result.type).toBe('Manifest');
    expect(result.data.foo).toBe('bar');
  });

  it('caches the resource and returns from cache', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ type: 'Manifest', foo: 'bar' }),
    });

    // First call fetches and caches
    await fetchResource(TEST_URL);
    // Second call should use cache (fetch not called again)
    await fetchResource(TEST_URL);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws a generic error on HTTP error due to catch block', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    // The original code catches the TamerlaneResourceError and re-throws a generic Error.
    await expect(fetchResource(TEST_URL)).rejects.toThrow('Error fetching IIIF resource');
  });

  it('throws a generic error on invalid IIIF resource type due to catch block', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ type: 'NotAType' }),
    });

    // The original code catches the specific error and re-throws a generic Error.
    await expect(fetchResource(TEST_URL)).rejects.toThrow('Error fetching IIIF resource');
  });

  it('throws on fetch failure', async () => {
    // @ts-ignore
    global.fetch.mockRejectedValue(new Error('Network error'));

    // The original code catches the network error and re-throws a generic Error.
    await expect(fetchResource(TEST_URL)).rejects.toThrow('Error fetching IIIF resource');
  });
});
