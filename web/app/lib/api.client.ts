import { getApiBaseUrl } from './runtime-config.client';

type FetchOptions = RequestInit & {
  authToken?: string;
  skipCredentials?: boolean;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    message?: string,
  ) {
    super(message ?? `API error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

export async function fetchApi<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const response = await fetchApiResponse(path, options);

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return response.json() as Promise<T>;
}

async function buildApiError(response: Response): Promise<ApiError> {
  let message: string | undefined;

  try {
    const errorBody = (await response.clone().json()) as { message?: unknown };

    if (typeof errorBody.message === 'string' && errorBody.message.trim()) {
      message = errorBody.message;
    }
  } catch {
    // Ignore non-JSON error bodies and fall back to the HTTP status text.
  }

  return new ApiError(response.status, response.statusText, message);
}

export async function fetchApiResponse(
  path: string,
  options: FetchOptions = {},
): Promise<Response> {
  const { authToken, skipCredentials, ...init } = options;
  const base = getApiBaseUrl();
  const url = `${base}${path}`;
  const isFormDataBody =
    typeof FormData !== 'undefined' && init.body instanceof FormData;
  const headers = new Headers(init.headers);

  if (!isFormDataBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  return fetch(url, {
    ...init,
    credentials: skipCredentials ? 'omit' : 'include',
    headers,
  });
}
