// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom/jest environment polyfills (used by jspdf and some deps)
import { TextDecoder, TextEncoder } from 'util';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = globalThis as any;
if (!g.TextEncoder) g.TextEncoder = TextEncoder;
if (!g.TextDecoder) g.TextDecoder = TextDecoder;
