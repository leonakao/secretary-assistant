import type { BoundApiClient } from '~/lib/api-client-context';

export type ManagedWhatsAppConnectionStatus =
  | 'not-provisioned'
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'unknown';

export interface ManagedWhatsAppSettings {
  companyId: string;
  evolutionInstanceName: string | null;
  hasProvisionedInstance: boolean;
  connectionStatus: ManagedWhatsAppConnectionStatus;
  agentEnabled: boolean;
}

export interface ManagedWhatsAppConnectionPayload {
  qrCodeBase64: string | null;
  pairingCode: string | null;
  expiresAt: string | null;
}

export interface ManagedWhatsAppSettingsResponse {
  settings: ManagedWhatsAppSettings;
}

export interface ManagedWhatsAppConnectionPayloadResponse {
  settings: ManagedWhatsAppSettings;
  connectionPayload: ManagedWhatsAppConnectionPayload;
}

export interface UpdateManagedAgentStateInput {
  enabled: boolean;
}

export async function getManagedWhatsAppSettings(
  client: BoundApiClient,
): Promise<ManagedWhatsAppSettingsResponse> {
  return client.fetchApi<ManagedWhatsAppSettingsResponse>(
    '/companies/me/whatsapp-settings',
  );
}

export async function provisionManagedWhatsAppInstance(
  client: BoundApiClient,
): Promise<ManagedWhatsAppSettingsResponse> {
  return client.fetchApi<ManagedWhatsAppSettingsResponse>(
    '/companies/me/whatsapp-instance',
    {
      method: 'POST',
    },
  );
}

export async function getManagedWhatsAppConnectionPayload(
  client: BoundApiClient,
): Promise<ManagedWhatsAppConnectionPayloadResponse> {
  return client.fetchApi<ManagedWhatsAppConnectionPayloadResponse>(
    '/companies/me/whatsapp-connection',
    {
      method: 'POST',
    },
  );
}

export async function refreshManagedWhatsAppStatus(
  client: BoundApiClient,
): Promise<ManagedWhatsAppSettingsResponse> {
  return client.fetchApi<ManagedWhatsAppSettingsResponse>(
    '/companies/me/whatsapp-refresh',
    {
      method: 'POST',
    },
  );
}

export async function updateManagedAgentState(
  input: UpdateManagedAgentStateInput,
  client: BoundApiClient,
): Promise<ManagedWhatsAppSettingsResponse> {
  return client.fetchApi<ManagedWhatsAppSettingsResponse>(
    '/companies/me/agent-state',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function disconnectManagedWhatsApp(
  client: BoundApiClient,
): Promise<ManagedWhatsAppSettingsResponse> {
  return client.fetchApi<ManagedWhatsAppSettingsResponse>(
    '/companies/me/whatsapp-disconnect',
    {
      method: 'POST',
    },
  );
}
