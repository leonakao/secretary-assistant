import { bootstrapAuthSession, getSessionToken } from './session';
import { getCurrentUser } from './api/get-current-user';

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
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'user-1',
      authProviderId: 'auth0|123',
      name: 'Owner',
      email: 'owner@example.com',
      phone: null,
      createdAt: '2026-03-23T00:00:00.000Z',
      updatedAt: '2026-03-23T00:00:00.000Z',
    });

    await expect(
      bootstrapAuthSession(async () => ({
        __raw: 'token-123',
      })),
    ).resolves.toEqual({
      id: 'user-1',
      authProviderId: 'auth0|123',
      name: 'Owner',
      email: 'owner@example.com',
      phone: null,
      createdAt: '2026-03-23T00:00:00.000Z',
      updatedAt: '2026-03-23T00:00:00.000Z',
    });

    expect(getCurrentUser).toHaveBeenCalledWith('token-123');
  });
});
