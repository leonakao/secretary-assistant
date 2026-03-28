import { createElement } from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppAuthProvider, useAppAuth } from './auth-provider';

describe('AppAuthProvider', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_E2E_AUTH_MOCK', 'true');
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.localStorage.clear();
  });

  it('keeps the mock getIdTokenClaims callback stable across rerenders', () => {
    const captures: Array<unknown> = [];

    function Capture() {
      const { getIdTokenClaims } = useAppAuth();
      captures.push(getIdTokenClaims);
      return null;
    }

    const view = render(
      createElement(
        AppAuthProvider,
        null,
        createElement(Capture, null),
      ),
    );

    view.rerender(
      createElement(
        AppAuthProvider,
        null,
        createElement(Capture, null),
      ),
    );

    expect(captures).toHaveLength(2);
    expect(captures[0]).toBe(captures[1]);
  });
});
