import type { ReactNode } from 'react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import { AppAuthProvider } from '~/modules/auth/auth-provider';
import { useAppAuth } from '~/modules/auth/auth-provider';
import { getSessionToken } from '~/modules/auth/session';
import { ApiClientProvider } from '~/lib/api-client-context';
import './app.css';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function AuthenticatedProviders({ children }: { children: ReactNode }) {
  const { getIdTokenClaims } = useAppAuth();

  return (
    <ApiClientProvider getToken={() => getSessionToken(getIdTokenClaims)}>
      {children}
    </ApiClientProvider>
  );
}

export default function App() {
  return (
    <AppAuthProvider>
      <AuthenticatedProviders>
        <Outlet />
      </AuthenticatedProviders>
    </AppAuthProvider>
  );
}
