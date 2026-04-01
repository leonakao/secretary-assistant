import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, fetchApi } from './api.client';

describe('api.client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('surfaces the API message when an error payload provides one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Falha ao buscar o QR code.' }), {
          status: 500,
          statusText: 'Internal Server Error',
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(fetchApi('/companies/me/whatsapp-connection')).rejects.toEqual(
      expect.objectContaining<ApiError>({
        message: 'Falha ao buscar o QR code.',
        name: 'ApiError',
        status: 500,
        statusText: 'Internal Server Error',
      }),
    );
  });

  it('falls back to the HTTP status when the error body has no message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'bad request' }), {
          status: 400,
          statusText: 'Bad Request',
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(fetchApi('/companies/me/agent-state')).rejects.toEqual(
      expect.objectContaining<ApiError>({
        message: 'API error: 400 Bad Request',
        name: 'ApiError',
        status: 400,
        statusText: 'Bad Request',
      }),
    );
  });
});
