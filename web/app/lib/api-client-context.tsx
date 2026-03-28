import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router';
import { fetchApi, fetchApiResponse } from './api.client';
import { ApiError } from './api.client';
import { buildUnauthorizedSessionRecoveryPath } from '~/modules/auth/session-recovery';

export type { ApiError };

type FetchOptions = Parameters<typeof fetchApi>[1];
type FetchResponseOptions = Parameters<typeof fetchApiResponse>[1];

export interface BoundApiClient {
  fetchApi: <T>(path: string, options?: Omit<FetchOptions, 'authToken'>) => Promise<T>;
  fetchApiResponse: (path: string, options?: Omit<FetchResponseOptions, 'authToken'>) => Promise<Response>;
}

export type LoaderFactory<TData, TParams extends unknown[] = []> = (
  client: BoundApiClient,
) => (...params: TParams) => Promise<TData>;

export interface PageLoaderState<TData> {
  data: TData | null;
  error: string | null;
  isLoading: boolean;
  reload: () => void;
}

const ApiClientContext = createContext<BoundApiClient | null>(null);

interface ApiClientProviderProps {
  getToken: () => Promise<string>;
  children: ReactNode;
}

export function ApiClientProvider({ getToken, children }: ApiClientProviderProps) {
  const client = useMemo<BoundApiClient>(
    () => ({
      fetchApi: async <T,>(path: string, options?: Omit<FetchOptions, 'authToken'>) => {
        const authToken = await getToken();
        return fetchApi<T>(path, { ...options, authToken });
      },
      fetchApiResponse: async (path: string, options?: Omit<FetchResponseOptions, 'authToken'>) => {
        const authToken = await getToken();
        return fetchApiResponse(path, { ...options, authToken });
      },
    }),
    [getToken],
  );

  return (
    <ApiClientContext.Provider value={client}>
      {children}
    </ApiClientContext.Provider>
  );
}

export function useApiClient(): BoundApiClient {
  const client = useContext(ApiClientContext);

  if (!client) {
    throw new Error('useApiClient must be used within ApiClientProvider');
  }

  return client;
}

export function usePageLoader<TData, TParams extends unknown[] = []>(
  loaderFactory: LoaderFactory<TData, TParams>,
  redirectOnUnauthorized: string = '/dashboard',
): PageLoaderState<TData> & { loader: (...params: TParams) => Promise<void> } {
  const client = useApiClient();
  const navigate = useNavigate();
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loader = useCallback(
    async (...params: TParams) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await loaderFactory(client)(...params);
        setData(result);
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) {
          void navigate(
            buildUnauthorizedSessionRecoveryPath(redirectOnUnauthorized),
            { replace: true },
          );
          return;
        }
        setError(
          cause instanceof Error ? cause.message : 'Something went wrong.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [client, loaderFactory, navigate, redirectOnUnauthorized],
  );

  const reload = useCallback(() => {
    void loader(...([] as unknown as TParams));
  }, [loader]);

  return { data, error, isLoading, reload, loader };
}
