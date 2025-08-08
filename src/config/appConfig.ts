// src/config/appConfig.ts

export const availableLanguages = [
  { code: 'en', name: 'English' },
  { code: 'la', name: 'Latin' },
  { code: 'de', name: 'German' },
];

export const APP_NAME = 'Tamerlane';

export const DEFAULT_LANGUAGE = 'en';

export const SHOW_LOGO = true;

export const maxSearchPages = 10;

// Network configuration
export const networkConfig = {
  fetchTimeoutMs: 15_000,        // Global per-request timeout
  fetchRetries: 3,               // Total attempts including first
  retryBaseDelayMs: 150,         // Initial backoff delay
  retryMaxDelayMs: 1500,         // Max backoff delay
  searchDebounceMs: process.env.NODE_ENV === 'test' ? 0 : 300, // 0 in tests for sync behavior
};

