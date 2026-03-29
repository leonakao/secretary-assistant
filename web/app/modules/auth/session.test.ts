import { bootstrapAuthSession, getSessionToken, isUnauthorizedSessionError } from './session';
import { getCurrentUser } from './api/get-current-user';
import { ApiError } from '~/lib/api.client';

vi.mock('./api/get-current-user', () => ({
  getCurrentUser: vi.fn(),
}));

describe('getSessionToken', () => {
  it('returns the raw Auth0 token from the ID token claims', async () => {
    await expect(
      getSessionToken(async () => ({
        __raw: 'token-123',
      })),
    ).resolves.toBe('token-123');
  });

  it('fails when the Auth0 claims do not expose a raw token', async () => {
    await expect(getSessionToken(async () => undefined)).rejects.toThrow(
      'Missing Auth0 ID token',
    );
  });
});

describe('bootstrapAuthSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the current user with the session token', async () => {
    const sessionUser = {
      id: 'user-1',
      authProviderId: 'auth0|123',
      name: 'Owner',
      email: 'owner@example.com',
      phone: null,
      createdAt: '2026-03-23T00:00:00.000Z',
      updatedAt: '2026-03-23T00:00:00.000Z',
      company: {
        id: 'company-1',
        name: 'Acme',
        step: 'running' as const,
        role: 'owner' as const,
      },
      onboarding: {
        requiresOnboarding: false,
        step: 'complete' as const,
      },
    };

    vi.mocked(getCurrentUser).mockResolvedValue(sessionUser);

    await expect(
      bootstrapAuthSession(async () => ({
        __raw: 'token-123',
      })),
    ).resolves.toEqual(sessionUser);

    expect(getCurrentUser).toHaveBeenCalledWith('token-123');
  });

  it('times out when the current-user bootstrap never settles', async () => {
    vi.useFakeTimers();
    vi.mocked(getCurrentUser).mockReturnValue(new Promise(() => undefined));

    const bootstrapPromise = bootstrapAuthSession(
      async () => ({
        __raw: 'token-123',
      }),
      500,
    );
    const expectation = expect(bootstrapPromise).rejects.toThrow(
      'Session bootstrap timed out while validating the authenticated user.',
    );

    await vi.advanceTimersByTimeAsync(500);
    await expectation;

    vi.useRealTimers();
  });
});

describe('isUnauthorizedSessionError', () => {
  it('returns true for protected API 401 failures', () => {
    expect(isUnauthorizedSessionError(new ApiError(401, 'Unauthorized'))).toBe(
      true,
    );
  });

  it('returns false for non-401 failures', () => {
    expect(isUnauthorizedSessionError(new ApiError(500, 'Server Error'))).toBe(
      false,
    );
    expect(isUnauthorizedSessionError(new Error('boom'))).toBe(false);
  });
});
