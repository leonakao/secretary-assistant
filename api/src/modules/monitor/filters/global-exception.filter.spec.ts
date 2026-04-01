import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { GlobalExceptionFilter } from './global-exception.filter';

function makeHost() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const response = { status } as any;
  const request = {
    method: 'POST',
    url: '/webhooks/evolution/company-1/messages-upsert',
  } as any;

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as ArgumentsHost;

  return { host, response, request, status, json };
}

describe('GlobalExceptionFilter', () => {
  it('returns 413 for body-parser payload too large errors', () => {
    const filter = new GlobalExceptionFilter();
    const { host, status, json } = makeHost();

    filter.catch(
      {
        message: 'request entity too large',
        type: 'entity.too.large',
        status: 413,
      },
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'request entity too large',
          statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
          path: '/webhooks/evolution/company-1/messages-upsert',
        }),
      }),
    );
  });
});
