import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticatedAppShell } from './authenticated-app-shell';

const mockClearSession = vi.fn();
const mockLogout = vi.fn();
const mockGetIdTokenClaims = vi.fn();
const mockUseAppAuth = vi.fn();
const mockBootstrapAuthSession = vi.fn();
const mockIsUnauthorizedSessionError = vi.fn();
const mockLocation = { pathname: '/app', search: '' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');

  return {
    ...actual,
    Navigate: ({ to }: { replace?: boolean; to: string }) => (
      <div data-testid="navigate-target">{to}</div>
    ),
    NavLink: ({
      children,
      to,
    }: {
      children: React.ReactNode;
      to: string;
    }) => <a href={to}>{children}</a>,
    Outlet: ({ context }: { context?: unknown }) => (
      <div data-testid="shell-outlet">{JSON.stringify(context)}</div>
    ),
    useLocation: () => mockLocation,
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
  getAuth0LogoutReturnTo: () => 'http://localhost:5173',
}));

describe('AuthenticatedAppShell', () => {
  beforeEach(() => {
    mockBootstrapAuthSession.mockReset();
    mockClearSession.mockReset();
    mockClearSession.mockResolvedValue(undefined);
    mockGetIdTokenClaims.mockReset();
    mockIsUnauthorizedSessionError.mockReset();
    mockLogout.mockReset();
    mockUseAppAuth.mockReset();

    mockIsUnauthorizedSessionError.mockReturnValue(false);
    mockUseAppAuth.mockReturnValue({
      clearSession: mockClearSession,
      getIdTokenClaims: mockGetIdTokenClaims,
      isAuthenticated: true,
      isLoading: false,
      logout: mockLogout,
    });
  });

  it('redirects unauthenticated users to /login with /app redirectTo', () => {
    mockUseAppAuth.mockReturnValue({
      clearSession: mockClearSession,
      getIdTokenClaims: mockGetIdTokenClaims,
      isAuthenticated: false,
      isLoading: false,
      logout: mockLogout,
    });

    render(<AuthenticatedAppShell />);

    expect(screen.getByTestId('navigate-target')).toHaveTextContent(
      '/login?mode=signin&redirectTo=%2Fapp',
    );
  });

  it('redirects onboarding-required users to /onboarding', async () => {
    mockBootstrapAuthSession.mockResolvedValue({
      onboarding: { requiresOnboarding: true, step: 'assistant-chat' },
    });

    render(<AuthenticatedAppShell />);

    await waitFor(() => {
      expect(screen.getByTestId('navigate-target')).toHaveTextContent('/onboarding');
    });
  });

  it('redirects unauthorized protected bootstrap failures back to login recovery', async () => {
    mockBootstrapAuthSession.mockRejectedValue({ status: 401 });
    mockIsUnauthorizedSessionError.mockReturnValue(true);
    mockLocation.pathname = '/app/company';

    render(<AuthenticatedAppShell />);

    await waitFor(() => {
      expect(screen.getByTestId('navigate-target')).toHaveTextContent(
        '/login?mode=signin&redirectTo=%2Fapp%2Fcompany&sessionError=unauthorized',
      );
    });

    expect(mockClearSession).toHaveBeenCalled();
  });

  it('renders shared navigation for eligible users', async () => {
    mockBootstrapAuthSession.mockResolvedValue({
      company: { name: 'Acme Co' },
      email: 'owner@example.com',
      name: 'Owner',
      onboarding: { requiresOnboarding: false, step: 'complete' },
    });

    render(<AuthenticatedAppShell />);

    await waitFor(() => {
      expect(screen.getAllByText('Painel').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Minha empresa').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Contatos').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Configurações').length).toBeGreaterThan(0);
    expect(screen.getByTestId('shell-outlet')).toBeInTheDocument();
  });

  it('shows a visible error instead of hanging when the session payload is malformed', async () => {
    mockBootstrapAuthSession.mockResolvedValue({
      company: { name: 'Acme Co' },
      email: 'owner@example.com',
      name: 'Owner',
    });

    render(<AuthenticatedAppShell />);

    await waitFor(() => {
      expect(
        screen.getByText(/Cannot read properties of undefined|Falha ao processar a sessão autenticada da área de trabalho/),
      ).toBeInTheDocument();
    });
  });

  it('does not re-bootstrap the protected session on internal /app navigation', async () => {
    mockBootstrapAuthSession.mockResolvedValue({
      company: { name: 'Acme Co' },
      email: 'owner@example.com',
      name: 'Owner',
      onboarding: { requiresOnboarding: false, step: 'complete' },
    });

    const view = render(<AuthenticatedAppShell />);

    await waitFor(() => {
      expect(mockBootstrapAuthSession).toHaveBeenCalledTimes(1);
    });

    mockLocation.pathname = '/app/company';
    view.rerender(<AuthenticatedAppShell />);

    await waitFor(() => {
      expect(screen.getByTestId('shell-outlet')).toBeInTheDocument();
    });

    expect(mockBootstrapAuthSession).toHaveBeenCalledTimes(1);
  });

  it('keeps loading the protected session across rerenders while bootstrap is still pending', async () => {
    const pendingSession = deferred<{
      company: { name: string };
      email: string;
      name: string;
      onboarding: { requiresOnboarding: false; step: 'complete' };
    }>();
    mockBootstrapAuthSession.mockReturnValue(pendingSession.promise);

    const initialClaims = vi.fn();
    const nextClaims = vi.fn();
    const initialLogout = vi.fn();
    const nextLogout = vi.fn();

    mockUseAppAuth
      .mockReturnValueOnce({
        clearSession: mockClearSession,
        getIdTokenClaims: initialClaims,
        isAuthenticated: true,
        isLoading: false,
        logout: initialLogout,
      })
      .mockReturnValue({
        clearSession: mockClearSession,
        getIdTokenClaims: nextClaims,
        isAuthenticated: true,
        isLoading: false,
        logout: nextLogout,
      });

    const view = render(<AuthenticatedAppShell />);

    expect(screen.getByText('Preparando sua área de trabalho...')).toBeInTheDocument();

    view.rerender(<AuthenticatedAppShell />);

    pendingSession.resolve({
      company: { name: 'Acme Co' },
      email: 'owner@example.com',
      name: 'Owner',
      onboarding: { requiresOnboarding: false, step: 'complete' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('shell-outlet')).toBeInTheDocument();
    });

    expect(mockBootstrapAuthSession).toHaveBeenCalledTimes(1);
  });

  it('keeps the protected bootstrap alive when the app location changes before it resolves', async () => {
    const pendingSession = deferred<{
      company: { name: string };
      email: string;
      name: string;
      onboarding: { requiresOnboarding: false; step: 'complete' };
    }>();
    mockBootstrapAuthSession.mockReturnValue(pendingSession.promise);
    mockLocation.pathname = '/app';

    const view = render(<AuthenticatedAppShell />);

    mockLocation.pathname = '/app/company';
    view.rerender(<AuthenticatedAppShell />);

    pendingSession.resolve({
      company: { name: 'Acme Co' },
      email: 'owner@example.com',
      name: 'Owner',
      onboarding: { requiresOnboarding: false, step: 'complete' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('shell-outlet')).toBeInTheDocument();
    });

    expect(mockBootstrapAuthSession).toHaveBeenCalledTimes(1);
  });
});
