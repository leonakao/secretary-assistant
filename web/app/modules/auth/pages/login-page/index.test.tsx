import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './index';

const mockNavigate = vi.fn();
const mockLoginWithRedirect = vi.fn();
const mockGetIdTokenClaims = vi.fn();
const mockUseAppAuth = vi.fn();
const mockBootstrapAuthSession = vi.fn();
const mockIsUnauthorizedSessionError = vi.fn();
const mockSearchParams = new URLSearchParams('mode=signin&redirectTo=%2Fdashboard');

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
  getAuth0RedirectUri: () => 'http://localhost:5173/login',
}));

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLoginWithRedirect.mockReset();
    mockGetIdTokenClaims.mockReset();
    mockUseAppAuth.mockReset();
    mockBootstrapAuthSession.mockReset();
    mockIsUnauthorizedSessionError.mockReset();
    mockIsUnauthorizedSessionError.mockReturnValue(false);

    mockUseAppAuth.mockReturnValue({
      error: undefined,
      getIdTokenClaims: mockGetIdTokenClaims,
      isAuthenticated: true,
      isLoading: false,
      loginWithRedirect: mockLoginWithRedirect,
    });
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
    expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard', { replace: true });
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
});
