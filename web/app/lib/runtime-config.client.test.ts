import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getApiBaseUrl,
  getAuth0AppOrigin,
  getAuth0ClientId,
  getAuth0Domain,
  getAuth0LogoutReturnTo,
  getAuth0RedirectUri,
} from './runtime-config.client';

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

describe('getAuth0Domain', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the VITE_AUTH0_DOMAIN env value when set', () => {
    vi.stubEnv('VITE_AUTH0_DOMAIN', 'tenant.example.auth0.com');
    expect(getAuth0Domain()).toBe('tenant.example.auth0.com');
  });

  it('returns the configured Auth0 domain as fallback', () => {
    vi.stubEnv('VITE_AUTH0_DOMAIN', '');
    expect(getAuth0Domain()).toBe('dev-du3tsou284mgwefg.us.auth0.com');
  });
});

describe('getAuth0ClientId', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the VITE_AUTH0_CLIENT_ID env value when set', () => {
    vi.stubEnv('VITE_AUTH0_CLIENT_ID', 'test-client-id');
    expect(getAuth0ClientId()).toBe('test-client-id');
  });

  it('returns the configured Auth0 client id as fallback', () => {
    vi.stubEnv('VITE_AUTH0_CLIENT_ID', '');
    expect(getAuth0ClientId()).toBe('SJtvoRN584unasTOBo2fYogJM8HaWjWU');
  });
});

describe('getAuth0AppOrigin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the configured Auth0 app origin when set', () => {
    vi.stubEnv('VITE_AUTH0_APP_ORIGIN', 'http://127.0.0.1:4173');
    expect(getAuth0AppOrigin()).toBe('http://127.0.0.1:4173');
  });

  it('returns the fixed app origin required by the Auth0 application config', () => {
    expect(getAuth0AppOrigin()).toBe('http://localhost:5173');
  });
});

describe('getAuth0RedirectUri', () => {
  it('returns the fixed callback URL required by the Auth0 application config', () => {
    expect(getAuth0RedirectUri()).toBe('http://localhost:5173/login');
  });
});

describe('getAuth0LogoutReturnTo', () => {
  it('returns the fixed logout URL required by the Auth0 application config', () => {
    expect(getAuth0LogoutReturnTo()).toBe('http://localhost:5173/');
  });
});
