import { describe, expect, it, vi } from 'vitest';
import type { BoundApiClient } from '~/lib/api-client-context';
import {
  disconnectManagedWhatsApp,
  getManagedWhatsAppConnectionPayload,
  getManagedWhatsAppSettings,
  provisionManagedWhatsAppInstance,
  refreshManagedWhatsAppStatus,
  updateManagedAgentState,
} from './settings.api';

function createClient() {
  return {
    fetchApi: vi.fn(),
  } as unknown as BoundApiClient;
}

describe('settings.api', () => {
  it('loads managed WhatsApp settings', async () => {
    const client = createClient();
    vi.mocked(client.fetchApi).mockResolvedValue({ settings: {} });

    await getManagedWhatsAppSettings(client);

    expect(client.fetchApi).toHaveBeenCalledWith(
      '/companies/me/whatsapp-settings',
    );
  });

  it('provisions the managed WhatsApp instance', async () => {
    const client = createClient();
    vi.mocked(client.fetchApi).mockResolvedValue({ settings: {} });

    await provisionManagedWhatsAppInstance(client);

    expect(client.fetchApi).toHaveBeenCalledWith(
      '/companies/me/whatsapp-instance',
      {
        method: 'POST',
      },
    );
  });

  it('requests the managed WhatsApp connection payload', async () => {
    const client = createClient();
    vi.mocked(client.fetchApi).mockResolvedValue({
      settings: {},
      connectionPayload: {},
    });

    await getManagedWhatsAppConnectionPayload(client);

    expect(client.fetchApi).toHaveBeenCalledWith(
      '/companies/me/whatsapp-connection',
      {
        method: 'POST',
      },
    );
  });

  it('refreshes the managed WhatsApp status', async () => {
    const client = createClient();
    vi.mocked(client.fetchApi).mockResolvedValue({ settings: {} });

    await refreshManagedWhatsAppStatus(client);

    expect(client.fetchApi).toHaveBeenCalledWith(
      '/companies/me/whatsapp-refresh',
      {
        method: 'POST',
      },
    );
  });

  it('updates the managed agent state', async () => {
    const client = createClient();
    vi.mocked(client.fetchApi).mockResolvedValue({ settings: {} });

    await updateManagedAgentState(
      {
        enabled: false,
      },
      client,
    );

    expect(client.fetchApi).toHaveBeenCalledWith('/companies/me/agent-state', {
      method: 'POST',
      body: JSON.stringify({
        enabled: false,
      }),
    });
  });

  it('disconnects the managed WhatsApp session', async () => {
    const client = createClient();
    vi.mocked(client.fetchApi).mockResolvedValue({ settings: {} });

    await disconnectManagedWhatsApp(client);

    expect(client.fetchApi).toHaveBeenCalledWith(
      '/companies/me/whatsapp-disconnect',
      {
        method: 'POST',
      },
    );
  });
});
