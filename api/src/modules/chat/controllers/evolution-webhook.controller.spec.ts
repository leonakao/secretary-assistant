import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EvolutionWebhookController } from './evolution-webhook.controller';

describe('EvolutionWebhookController', () => {
  it('rejects webhook requests with an invalid configured token', async () => {
    const controller = new EvolutionWebhookController(
      { execute: vi.fn() } as any,
      {
        get: vi.fn((key: string) =>
          key === 'EVOLUTION_API_TOKEN' ? 'expected-token' : undefined,
        ),
      } as unknown as ConfigService,
    );

    await expect(
      controller.handleMessages('company-1', 'wrong-token', {
        instance: 'instance-1',
        data: {} as any,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts webhook requests when the configured token matches', async () => {
    const incomingMessageUseCase = {
      execute: vi.fn().mockResolvedValue({ message: 'ok' }),
    };
    const controller = new EvolutionWebhookController(
      incomingMessageUseCase as any,
      {
        get: vi.fn((key: string) =>
          key === 'EVOLUTION_API_TOKEN' ? 'expected-token' : undefined,
        ),
      } as unknown as ConfigService,
    );

    const result = await controller.handleMessages(
      'company-1',
      'expected-token',
      {
        instance: 'instance-1',
        data: {} as any,
      },
    );

    expect(incomingMessageUseCase.execute).toHaveBeenCalledWith(
      'company-1',
      'instance-1',
      {},
    );
    expect(result).toEqual({ success: true, message: 'ok' });
  });
});
