import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

const { jwtVerifyMock } = vi.hoisted(() => ({
  jwtVerifyMock: vi.fn(),
}));

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'jwks'),
  jwtVerify: jwtVerifyMock,
}));

function createDeterministicToken(claims: {
  sub?: string;
  email?: string;
  name?: string;
}) {
  return `e2e.${Buffer.from(JSON.stringify(claims)).toString('base64url')}`;
}

function createAuthService(options?: {
  e2eAuthMode?: boolean;
  nodeEnv?: string;
  repo?: {
    findOne?: ReturnType<typeof vi.fn>;
    create?: ReturnType<typeof vi.fn>;
    save?: ReturnType<typeof vi.fn>;
  };
}) {
  const repo = {
    findOne: options?.repo?.findOne ?? vi.fn(),
    create:
      options?.repo?.create ??
      vi.fn((value: Record<string, unknown>) => ({ id: 'user-1', ...value })),
    save:
      options?.repo?.save ??
      vi.fn(async (value: Record<string, unknown>) => ({
        id: 'user-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        ...value,
      })),
  };

  const configService = {
    get: vi.fn((key: string, fallback?: string) => {
      if (key === 'E2E_AUTH_MODE') {
        return options?.e2eAuthMode ? 'true' : 'false';
      }

      if (key === 'NODE_ENV') {
        return options?.nodeEnv ?? 'test';
      }

      return fallback;
    }),
  };

  return {
    authService: new AuthService(configService as any, repo as any),
    configService,
    repo,
  };
}

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('authenticates a valid deterministic token when E2E mode is enabled', async () => {
    const token = createDeterministicToken({
      sub: 'e2e|fresh-owner',
      email: 'fresh-owner@example.com',
      name: 'Fresh Owner',
    });
    const { authService, repo } = createAuthService({
      e2eAuthMode: true,
    });

    repo.findOne.mockResolvedValue(null);

    const result = await authService.authenticateBearerToken(token);

    expect(jwtVerifyMock).not.toHaveBeenCalled();
    expect(repo.findOne).toHaveBeenCalledWith({
      where: [
        { authProviderId: 'e2e|fresh-owner' },
        { email: 'fresh-owner@example.com' },
      ],
    });
    expect(repo.create).toHaveBeenCalledWith({
      authProviderId: 'e2e|fresh-owner',
      email: 'fresh-owner@example.com',
      name: 'Fresh Owner',
      phone: null,
    });
    expect(result.claims).toEqual({
      sub: 'e2e|fresh-owner',
      email: 'fresh-owner@example.com',
      name: 'Fresh Owner',
    });
    expect(result.user).toMatchObject({
      id: 'user-1',
      authProviderId: 'e2e|fresh-owner',
      email: 'fresh-owner@example.com',
      name: 'Fresh Owner',
    });
  });

  it('accepts the current web mock signup token when E2E mode is enabled', async () => {
    const { authService, repo } = createAuthService({
      e2eAuthMode: true,
    });

    repo.findOne.mockResolvedValue(null);

    const result = await authService.authenticateBearerToken(
      'mock-e2e-signup-token',
    );

    expect(jwtVerifyMock).not.toHaveBeenCalled();
    expect(result.claims).toEqual({
      sub: 'auth0|signup-user',
      email: 'new-owner@example.com',
      name: 'New Owner',
    });
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it('rejects deterministic tokens when E2E mode is disabled', async () => {
    const { authService, repo } = createAuthService({
      e2eAuthMode: false,
    });

    jwtVerifyMock.mockRejectedValue(new Error('invalid token'));

    await expect(
      authService.authenticateBearerToken(
        createDeterministicToken({
          sub: 'e2e|owner',
          email: 'owner@example.com',
          name: 'Owner',
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(jwtVerifyMock).toHaveBeenCalledOnce();
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('rejects malformed deterministic tokens with 401 when E2E mode is enabled', async () => {
    const { authService, repo } = createAuthService({
      e2eAuthMode: true,
    });

    await expect(
      authService.authenticateBearerToken(
        `e2e.${Buffer.from('not-json').toString('base64url')}`,
      ),
    ).rejects.toThrowError('Invalid E2E session token');

    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('rejects deterministic tokens missing required claims', async () => {
    const { authService, repo } = createAuthService({
      e2eAuthMode: true,
    });

    await expect(
      authService.authenticateBearerToken(
        createDeterministicToken({
          sub: 'e2e|owner',
          email: 'owner@example.com',
        }),
      ),
    ).rejects.toThrowError('Invalid E2E session token');

    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('falls back to Auth0 verification for non-E2E tokens even when E2E mode is enabled', async () => {
    const existingUser = {
      id: 'user-2',
      authProviderId: 'auth0|owner',
      email: 'owner@example.com',
      name: 'Owner',
    };
    const { authService, repo } = createAuthService({
      e2eAuthMode: true,
    });

    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: 'auth0|owner',
        email: 'owner@example.com',
        name: 'Owner',
      },
    });
    repo.findOne.mockResolvedValue(existingUser);

    const result = await authService.authenticateBearerToken('real-jwt-token');

    expect(jwtVerifyMock).toHaveBeenCalledOnce();
    expect(repo.save).not.toHaveBeenCalled();
    expect(result.user).toBe(existingUser);
    expect(result.claims).toEqual({
      sub: 'auth0|owner',
      email: 'owner@example.com',
      name: 'Owner',
    });
  });
});
