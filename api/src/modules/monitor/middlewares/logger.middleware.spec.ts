import { describe, expect, it, vi } from 'vitest';
import { LoggerMiddleware } from './logger.middleware';

describe('LoggerMiddleware', () => {
  it('redacts configured sensitive fields in request and response logs', () => {
    const middleware = new LoggerMiddleware();
    const logSpy = vi
      .spyOn((middleware as any).logger, 'log')
      .mockImplementation(() => undefined);

    const handlers: Record<string, () => void> = {};
    const req = {
      method: 'POST',
      originalUrl: '/webhooks/evolution/company-1/messages-upsert',
      ip: '127.0.0.1',
      body: {
        event: 'messages.upsert',
        data: {
          base64: 'very-secret-audio',
          apikey: 'top-secret-api-key',
          authorization: 'Bearer secret-token',
        },
      },
    } as any;
    const res = {
      statusCode: 200,
      send(data: any) {
        return data;
      },
      on(event: string, handler: () => void) {
        handlers[event] = handler;
      },
    } as any;
    const next = vi.fn();

    middleware.use(req, res, next);
    res.send(
      JSON.stringify({
        success: true,
        payload: {
          base64: 'response-secret',
          apikey: 'response-api-key',
          token: 'response-token',
        },
      }),
    );
    handlers.finish();

    expect(next).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('"base64":"[redacted]"'),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('"apikey":"[redacted]"'),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('"authorization":"[redacted]"'),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('"token":"[redacted]"'),
    );
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('very-secret-audio'),
    );
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('top-secret-api-key'),
    );
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('response-secret'),
    );
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('response-api-key'),
    );
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Bearer secret-token'),
    );
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('response-token'),
    );
  });
});
