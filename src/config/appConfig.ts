// src/config/appConfig.ts

export const APP_NAME = 'Tamerlane';

export const DEFAULT_LANGUAGE = 'en';

export const SHOW_LOGO = true;

export const maxSearchPages = 10;

// DoS guard for annotation pagination: caps how many AnnotationPage fetches
// a single canvas can trigger. Without this, a manifest pointing at an
// annotation server that always returns a `next` URL would loop forever.
export const maxAnnotationPages = 20;

export const MOTIVATIONS = [
  'bookmarking',
  'classifying',
  'commenting',
  'describing',
  'transcribing',
  'editing',
  'highlighting',
  'contextualizing',
  'identifying',
  'linking',
  'moderating',
  'questioning',
  'replying',
  'supplementing',
  'tagging',
];

// Network configuration
export const networkConfig = {
  forceHttps: false,             // Automatically upgrade all HTTP URLs to HTTPS
  fetchTimeoutMs: 15_000,        // Global per-request timeout
  fetchRetries: 3,               // Total attempts including first
  retryBaseDelayMs: 150,         // Initial backoff delay
  retryMaxDelayMs: 1500,         // Max backoff delay
  searchDebounceMs: process.env.NODE_ENV === 'test' ? 0 : 300, // 0 in tests for sync behavior
};

