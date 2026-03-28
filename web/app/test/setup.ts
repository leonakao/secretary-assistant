import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

(globalThis as typeof globalThis & {
  __vite_plugin_react_preamble_installed__?: boolean;
}).__vite_plugin_react_preamble_installed__ = true;

afterEach(() => {
  cleanup();
});
