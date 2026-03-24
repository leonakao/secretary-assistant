import { getApiBaseUrl } from './runtime-config.client';

type FetchOptions = RequestInit & {
  authToken?: string;
  skipCredentials?: boolean;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
  ) {
    super(`API error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

export async function fetchApi<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const response = await fetchApiResponse(path, options);

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText);
  }

  return response.json() as Promise<T>;
}

export async function fetchApiResponse(
  path: string,
  options: FetchOptions = {},
): Promise<Response> {
  const { authToken, skipCredentials, ...init } = options;
  const base = getApiBaseUrl();
  const url = `${base}${path}`;

  return fetch(url, {
    ...init,
    credentials: skipCredentials ? 'omit' : 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...init.headers,
    },
  });
}
