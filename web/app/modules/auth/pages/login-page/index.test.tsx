import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './index';

const mockNavigate = vi.fn();
const mockLoginWithRedirect = vi.fn();
const mockGetIdTokenClaims = vi.fn();
const mockClearSession = vi.fn();
const mockLogout = vi.fn();
const mockUseAppAuth = vi.fn();
const mockBootstrapAuthSession = vi.fn();
const mockIsUnauthorizedSessionError = vi.fn();
let mockSearchParams = new URLSearchParams('mode=signin&redirectTo=%2Fapp');
const mockLocationReplace = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');

  return {
    ...actual,
    Link: ({ children, to, ...props }: React.ComponentProps<'a'> & { to: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
  };
});

vi.mock('~/modules/auth/auth-provider', () => ({
  useAppAuth: () => mockUseAppAuth(),
}));

vi.mock('~/modules/auth/session', () => ({
  bootstrapAuthSession: (...args: unknown[]) => mockBootstrapAuthSession(...args),
  isUnauthorizedSessionError: (...args: unknown[]) =>
    mockIsUnauthorizedSessionError(...args),
}));

vi.mock('~/lib/runtime-config.client', () => ({
  getAuth0AppOrigin: () => 'http://localhost:5173',
  getAuth0RedirectUri: () => 'http://localhost:5173/login',
}));

describe('LoginPage', () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams('mode=signin&redirectTo=%2Fapp');
    mockLocationReplace.mockReset();
    mockNavigate.mockReset();
    mockClearSession.mockReset();
    mockClearSession.mockResolvedValue(undefined);
    mockLoginWithRedirect.mockReset();
    mockGetIdTokenClaims.mockReset();
    mockLogout.mockReset();
    mockUseAppAuth.mockReset();
    mockBootstrapAuthSession.mockReset();
    mockIsUnauthorizedSessionError.mockReset();
    mockIsUnauthorizedSessionError.mockReturnValue(false);

    mockUseAppAuth.mockReturnValue({
      clearSession: mockClearSession,
      error: undefined,
      getIdTokenClaims: mockGetIdTokenClaims,
      isAuthenticated: true,
      isLoading: false,
      loginWithRedirect: mockLoginWithRedirect,
      logout: mockLogout,
    });
  });

  beforeAll(() => {
    vi.stubGlobal('location', {
      ...window.location,
      replace: mockLocationReplace,
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('stays on the login page when session bootstrap fails with a non-401 error', async () => {
    mockBootstrapAuthSession.mockRejectedValue(new Error('Backend unavailable'));

    render(<LoginPage />);

    await waitFor(() => {
      expect(
        screen.getByText("We couldn't validate your session"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Backend unavailable')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalledWith('/app', { replace: true });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('retries session bootstrap without redirecting into a protected route', async () => {
    mockBootstrapAuthSession
      .mockRejectedValueOnce(new Error('Backend unavailable'))
      .mockRejectedValueOnce(new Error('Still unavailable'));

    render(<LoginPage />);

    await screen.findByTestId('login-session-retry-button');

    fireEvent.click(screen.getByTestId('login-session-retry-button'));

    await waitFor(() => {
      expect(mockBootstrapAuthSession).toHaveBeenCalledTimes(2);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText('Still unavailable')).toBeInTheDocument();
  });

  it('redirects 401 bootstrap failures into login recovery instead of staying on active session', async () => {
    mockBootstrapAuthSession.mockRejectedValue({
      status: 401,
    });
    mockIsUnauthorizedSessionError.mockReturnValue(true);

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockClearSession).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockLocationReplace).toHaveBeenCalledWith(
        'http://localhost:5173/login?mode=signin&redirectTo=%2Fapp&sessionError=unauthorized',
      );
    });
  });

  it('preserves /app deep links after successful session bootstrap', async () => {
    mockSearchParams = new URLSearchParams(
      'mode=signin&redirectTo=%2Fapp%2Fcompany',
    );
    mockBootstrapAuthSession.mockResolvedValue({
      onboarding: { requiresOnboarding: false, step: 'complete' },
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app/company', {
        replace: true,
      });
    });
  });

  it('does not re-bootstrap the session on a rerender with the same auth state', async () => {
    mockBootstrapAuthSession.mockResolvedValue({
      onboarding: { requiresOnboarding: false, step: 'complete' },
    });

    const view = render(<LoginPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app', { replace: true });
    });

    mockNavigate.mockReset();
    view.rerender(<LoginPage />);

    expect(mockBootstrapAuthSession).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('keeps the login bootstrap alive when auth callbacks rerender before it resolves', async () => {
    let resolveBootstrap!: (value: {
      onboarding: { requiresOnboarding: false; step: 'complete' };
    }) => void;
    const pendingBootstrap = new Promise<{
      onboarding: { requiresOnboarding: false; step: 'complete' };
    }>((resolve) => {
      resolveBootstrap = resolve;
    });

    mockBootstrapAuthSession.mockReturnValue(pendingBootstrap);

    const initialClaims = vi.fn();
    const nextClaims = vi.fn();

    mockUseAppAuth
      .mockReturnValueOnce({
        clearSession: mockClearSession,
        error: undefined,
        getIdTokenClaims: initialClaims,
        isAuthenticated: true,
        isLoading: false,
        loginWithRedirect: mockLoginWithRedirect,
        logout: mockLogout,
      })
      .mockReturnValue({
        clearSession: mockClearSession,
        error: undefined,
        getIdTokenClaims: nextClaims,
        isAuthenticated: true,
        isLoading: false,
        loginWithRedirect: mockLoginWithRedirect,
        logout: mockLogout,
      });

    const view = render(<LoginPage />);

    expect(screen.getByText('Resolving your session...')).toBeInTheDocument();

    view.rerender(<LoginPage />);

    resolveBootstrap({
      onboarding: { requiresOnboarding: false, step: 'complete' },
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app', { replace: true });
    });

    expect(mockBootstrapAuthSession).toHaveBeenCalledTimes(1);
  });

  it('still prefers onboarding when the authenticated user requires onboarding', async () => {
    mockSearchParams = new URLSearchParams(
      'mode=signin&redirectTo=%2Fapp%2Fcompany',
    );
    mockBootstrapAuthSession.mockResolvedValue({
      onboarding: { requiresOnboarding: true, step: 'assistant-chat' },
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/onboarding', {
        replace: true,
      });
    });
  });

  it('sends signup through onboarding instead of /app', async () => {
    mockUseAppAuth.mockReturnValue({
      clearSession: mockClearSession,
      error: undefined,
      getIdTokenClaims: mockGetIdTokenClaims,
      isAuthenticated: false,
      isLoading: false,
      loginWithRedirect: mockLoginWithRedirect,
      logout: mockLogout,
    });
    mockSearchParams = new URLSearchParams('mode=signup');

    render(<LoginPage />);

    fireEvent.click(screen.getByTestId('login-signup-button'));

    expect(mockLoginWithRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: {
          returnTo: '/onboarding',
        },
        authorizationParams: expect.objectContaining({
          screen_hint: 'signup',
        }),
      }),
    );
  });
});
