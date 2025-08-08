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

  it('throws a structured NETWORK_MANIFEST_FETCH error on HTTP error', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });
    await expect(fetchResource(TEST_URL)).rejects.toMatchObject({
      code: 'NETWORK_MANIFEST_FETCH',
      message: expect.stringContaining('HTTP error 404'),
    });
  });

  it('throws a structured PARSING_MANIFEST error on invalid IIIF resource type', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ type: 'NotAType' }),
    });
    await expect(fetchResource(TEST_URL)).rejects.toMatchObject({
      code: 'PARSING_MANIFEST',
      message: expect.stringContaining('Invalid IIIF resource type'),
    });
  });

  it('throws structured NETWORK_MANIFEST_FETCH on network failure', async () => {
    // @ts-ignore
    global.fetch.mockRejectedValue(new Error('Network error'));
    await expect(fetchResource(TEST_URL)).rejects.toMatchObject({
      code: 'NETWORK_MANIFEST_FETCH',
      message: expect.stringContaining('Error fetching IIIF resource'),
    });
  });
});
