import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticatedAppShell } from './authenticated-app-shell';

const mockLogout = vi.fn();
const mockGetIdTokenClaims = vi.fn();
const mockUseAppAuth = vi.fn();
const mockBootstrapAuthSession = vi.fn();
const mockIsUnauthorizedSessionError = vi.fn();
const mockLocation = { pathname: '/app', search: '' };

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
  getAuth0AppOrigin: () => 'http://localhost:5173',
  getAuth0LogoutReturnTo: () => 'http://localhost:5173',
}));

describe('AuthenticatedAppShell', () => {
  beforeEach(() => {
    mockBootstrapAuthSession.mockReset();
    mockGetIdTokenClaims.mockReset();
    mockIsUnauthorizedSessionError.mockReset();
    mockLogout.mockReset();
    mockUseAppAuth.mockReset();

    mockIsUnauthorizedSessionError.mockReturnValue(false);
    mockUseAppAuth.mockReturnValue({
      getIdTokenClaims: mockGetIdTokenClaims,
      isAuthenticated: true,
      isLoading: false,
      logout: mockLogout,
    });
  });

  it('redirects unauthenticated users to /login with /app redirectTo', () => {
    mockUseAppAuth.mockReturnValue({
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

  it('renders shared navigation for eligible users', async () => {
    mockBootstrapAuthSession.mockResolvedValue({
      company: { name: 'Acme Co' },
      email: 'owner@example.com',
      name: 'Owner',
      onboarding: { requiresOnboarding: false, step: 'complete' },
    });

    render(<AuthenticatedAppShell />);

    await waitFor(() => {
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Minha empresa').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Contatos').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Configurações').length).toBeGreaterThan(0);
    expect(screen.getByTestId('shell-outlet')).toBeInTheDocument();
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
});
