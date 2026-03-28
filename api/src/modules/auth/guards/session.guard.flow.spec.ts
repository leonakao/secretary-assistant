import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionGuard } from './session.guard';
import { AuthService } from '../services/auth.service';
import type { AuthenticatedRequest } from '../auth.types';
import { User } from 'src/modules/users/entities/user.entity';
import { UsersMeController } from 'src/modules/users/controllers/users-me.controller';
import { OnboardingStateController } from 'src/modules/onboarding/controllers/onboarding-state.controller';
import { OnboardingCompanyController } from 'src/modules/onboarding/controllers/onboarding-company.controller';
import { OnboardingMessagesController } from 'src/modules/onboarding/controllers/onboarding-messages.controller';

function createDeterministicToken(claims: {
  sub: string;
  email: string;
  name: string;
}) {
  return `e2e.${Buffer.from(JSON.stringify(claims)).toString('base64url')}`;
}

function createExecutionContext(
  request: Partial<AuthenticatedRequest>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('SessionGuard flow', () => {
  let savedUsers: Array<User>;

  beforeEach(() => {
    savedUsers = [];
  });

  function createGuardedContext() {
    const usersRepository = {
      findOne: vi.fn(
        async ({ where }: { where: Array<Record<string, string>> }) =>
          savedUsers.find((user) =>
            where.some(
              (clause) =>
                (clause.authProviderId &&
                  user.authProviderId === clause.authProviderId) ||
                (clause.email && user.email === clause.email),
            ),
          ) ?? null,
      ),
      create: vi.fn((value: Partial<User>) => ({
        id: `user-${savedUsers.length + 1}`,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
        phone: null,
        userCompanies: [],
        ...value,
      })),
      save: vi.fn(async (value: User) => {
        const existingIndex = savedUsers.findIndex(
          (user) => user.id === value.id,
        );
        const nextValue = {
          ...value,
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        } as User;

        if (existingIndex >= 0) {
          savedUsers[existingIndex] = nextValue;
        } else {
          savedUsers.push(nextValue);
        }

        return nextValue;
      }),
    };

    const configService = {
      get: vi.fn((key: string, fallback?: string) => {
        if (key === 'E2E_AUTH_MODE') {
          return 'true';
        }

        if (key === 'NODE_ENV') {
          return 'test';
        }

        return fallback;
      }),
    } satisfies Pick<ConfigService, 'get'>;

    const authService = new AuthService(
      configService as ConfigService,
      usersRepository as never,
    );
    const sessionGuard = new SessionGuard(authService);

    return {
      authService,
      configService,
      sessionGuard,
      usersRepository,
    };
  }

  it('creates a fresh user and reaches GET /users/me through deterministic auth', async () => {
    const token = createDeterministicToken({
      sub: 'e2e|fresh-owner',
      email: 'fresh-owner@example.com',
      name: 'Fresh Owner',
    });
    const getUsersMe = {
      execute: vi.fn((user: User) => ({
        id: user.id,
        authProviderId: user.authProviderId,
        email: user.email,
        name: user.name,
        phone: user.phone,
        company: null,
        onboarding: {
          step: 'company-bootstrap',
          requiresOnboarding: true,
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
    };
    const controller = new UsersMeController(getUsersMe as never);
    const { sessionGuard, usersRepository } = createGuardedContext();
    const request = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as Partial<AuthenticatedRequest>;

    await expect(
      sessionGuard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);

    const result = await controller.getMe(request.session!.user);

    expect(usersRepository.save).toHaveBeenCalledOnce();
    expect(getUsersMe.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        authProviderId: 'e2e|fresh-owner',
        email: 'fresh-owner@example.com',
        name: 'Fresh Owner',
      }),
    );
    expect(result).toMatchObject({
      id: 'user-1',
      authProviderId: 'e2e|fresh-owner',
      email: 'fresh-owner@example.com',
      onboarding: {
        step: 'company-bootstrap',
        requiresOnboarding: true,
      },
    });
  });

  it('returns 401 for malformed deterministic tokens before controller execution', async () => {
    const { sessionGuard } = createGuardedContext();
    const request = {
      headers: {
        authorization: `Bearer e2e.${Buffer.from('not-json').toString('base64url')}`,
      },
    } as Partial<AuthenticatedRequest>;

    await expect(
      sessionGuard.canActivate(createExecutionContext(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('preserves stage-specific onboarding failures after auth succeeds', async () => {
    const token = createDeterministicToken({
      sub: 'e2e|fresh-owner',
      email: 'fresh-owner@example.com',
      name: 'Fresh Owner',
    });
    const getOnboardingState = {
      execute: vi.fn(() => {
        throw new NotFoundException(
          'No onboarding company found for this user',
        );
      }),
    };
    const controller = new OnboardingStateController(
      getOnboardingState as never,
    );
    const { sessionGuard } = createGuardedContext();
    const request = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as Partial<AuthenticatedRequest>;

    await sessionGuard.canActivate(createExecutionContext(request));

    await expect(controller.getState(request.session!.user)).rejects.toThrow(
      'No onboarding company found for this user',
    );
    expect(getOnboardingState.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        email: 'fresh-owner@example.com',
      }),
    );
  });

  it('reaches onboarding company bootstrap and message initialization with the same authenticated user', async () => {
    const token = createDeterministicToken({
      sub: 'e2e|fresh-owner',
      email: 'fresh-owner@example.com',
      name: 'Fresh Owner',
    });
    const createOnboardingCompany = {
      execute: vi.fn(
        (user: User, dto: { name: string; businessType?: string }) => ({
          company: {
            id: 'company-1',
            name: dto.name,
            businessType: dto.businessType ?? null,
            step: 'onboarding',
          },
          onboarding: {
            step: 'assistant-chat',
            requiresOnboarding: true,
          },
          userId: user.id,
        }),
      ),
    };
    const initializeOnboardingConversation = {
      execute: vi.fn((user: User) => ({
        threadId: `onboarding:company-1:${user.id}`,
        company: {
          id: 'company-1',
          name: 'Fresh Co',
          step: 'onboarding',
        },
        onboarding: {
          step: 'assistant-chat',
          requiresOnboarding: true,
        },
        messages: [],
      })),
    };
    const companyController = new OnboardingCompanyController(
      createOnboardingCompany as never,
    );
    const messagesController = new OnboardingMessagesController(
      initializeOnboardingConversation as never,
      { execute: vi.fn() } as never,
    );
    const { sessionGuard } = createGuardedContext();
    const request = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as Partial<AuthenticatedRequest>;

    await sessionGuard.canActivate(createExecutionContext(request));

    const companyResult = await companyController.createCompany(
      request.session!.user,
      {
        name: 'Fresh Co',
        businessType: 'Plumbing',
      } as never,
    );
    const initializeResult = await messagesController.initialize(
      request.session!.user,
    );

    expect(createOnboardingCompany.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        authProviderId: 'e2e|fresh-owner',
      }),
      {
        name: 'Fresh Co',
        businessType: 'Plumbing',
      },
    );
    expect(initializeOnboardingConversation.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        authProviderId: 'e2e|fresh-owner',
      }),
    );
    expect(companyResult).toMatchObject({
      company: {
        id: 'company-1',
        name: 'Fresh Co',
        businessType: 'Plumbing',
      },
      onboarding: {
        step: 'assistant-chat',
        requiresOnboarding: true,
      },
      userId: 'user-1',
    });
    expect(initializeResult.threadId).toBe('onboarding:company-1:user-1');
  });
});
