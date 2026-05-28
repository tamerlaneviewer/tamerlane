// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom in CRA's Jest preset doesn't expose TextEncoder/TextDecoder on the
// global, but our content-state helpers (and any code that base64-encodes UTF-8
// text) depend on them. Polyfill from Node's util so tests can exercise the
// real production code paths.
import { TextEncoder, TextDecoder } from 'util';
if (typeof (globalThis as any).TextEncoder === 'undefined') {
  (globalThis as any).TextEncoder = TextEncoder;
}
if (typeof (globalThis as any).TextDecoder === 'undefined') {
  (globalThis as any).TextDecoder = TextDecoder;
}
