import { describe, expect, it } from 'vitest';
import {
  buildSettingsWebhookRequestBody,
  createSettingsApiClient,
} from './settings-api';
import { createSettingsOwnerIdentity } from './settings-auth';

describe('settings-api support', () => {
  it('builds deterministic webhook payload defaults', () => {
    const body = buildSettingsWebhookRequestBody(
      'company-123',
      {
        remoteJid: '5511999999999@s.whatsapp.net',
        text: 'Oi',
      },
      3,
    );

    expect(body).toEqual({
      data: {
        key: {
          fromMe: false,
          id: 'settings-e2e-company-123-3',
          remoteJid: '5511999999999@s.whatsapp.net',
        },
        message: {
          conversation: 'Oi',
        },
        messageTimestamp: 1762400003,
        pushName: undefined,
      },
      instance: 'settings-e2e-company-123',
    });
  });

  it('increments webhook defaults deterministically per client instance', async () => {
    const fetchCalls: Array<{ data: unknown; headers?: Record<string, string> }> = [];
    const request = {
      fetch: async (_url: string, init?: { data?: unknown; headers?: Record<string, string> }) => {
        fetchCalls.push({
          data: init?.data,
          headers: init?.headers,
        });

        return {
          json: async () => ({ message: '' }),
          ok: () => true,
          status: () => 200,
          statusText: () => 'OK',
        };
      },
    } as never;
    const identity = createSettingsOwnerIdentity({ key: 'settings-api-test' });
    const client = createSettingsApiClient(request, {
      identity,
    });

    await client.sendEvolutionMessage('company-seq', {
      remoteJid: '5511999999999@s.whatsapp.net',
      text: 'primeira',
    });
    await client.sendEvolutionMessage('company-seq', {
      remoteJid: '5511999999999@s.whatsapp.net',
      text: 'segunda',
    });

    expect(fetchCalls).toHaveLength(2);
    expect(fetchCalls[0]?.data).toMatchObject({
      data: {
        key: {
          id: 'settings-e2e-company-seq-1',
        },
        messageTimestamp: 1762400001,
      },
    });
    expect(fetchCalls[1]?.data).toMatchObject({
      data: {
        key: {
          id: 'settings-e2e-company-seq-2',
        },
        messageTimestamp: 1762400002,
      },
    });
  });
});
