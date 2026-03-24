import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { SessionGuard } from './session.guard';
import type { AuthenticatedRequest } from '../auth.types';

describe('SessionGuard', () => {
  const authService = {
    authenticateBearerToken: vi.fn(),
  };

  const guard = new SessionGuard(authService as any);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createExecutionContext(
    request: Partial<AuthenticatedRequest>,
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  }

  it('stores the authenticated session on the request', async () => {
    const request = {
      headers: {
        authorization: 'Bearer test-token',
      },
    } as Partial<AuthenticatedRequest>;

    authService.authenticateBearerToken.mockResolvedValue({
      claims: { sub: 'auth0|123', email: 'owner@example.com', name: 'Owner' },
      user: { id: 'user-1' },
    });

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);

    expect(authService.authenticateBearerToken).toHaveBeenCalledWith(
      'test-token',
    );
    expect(request.session).toEqual({
      claims: { sub: 'auth0|123', email: 'owner@example.com', name: 'Owner' },
      user: { id: 'user-1' },
    });
  });

  it('rejects requests without a bearer token', async () => {
    const request = {
      headers: {},
    } as Partial<AuthenticatedRequest>;

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
