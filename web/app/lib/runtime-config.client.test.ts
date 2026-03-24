import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getApiBaseUrl } from './runtime-config.client';

describe('getApiBaseUrl', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the VITE_API_BASE_URL env value when set', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000');
    expect(getApiBaseUrl()).toBe('http://localhost:3000');
  });

  it('returns /api as fallback when VITE_API_BASE_URL is not set', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    expect(getApiBaseUrl()).toBe('/api');
  });
});
