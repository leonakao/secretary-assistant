export interface ManagedCompanyResult {
  id: string;
  name: string;
  businessType: string | null;
  description: string | null;
  step: 'onboarding' | 'running';
  updatedAt: Date;
}

export interface ManagedCompanyResponse {
  company: ManagedCompanyResult;
}

export type ManagedWhatsAppConnectionStatus =
  | 'not-provisioned'
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'unknown';

export interface ManagedWhatsAppSettingsResult {
  companyId: string;
  evolutionInstanceName: string | null;
  hasProvisionedInstance: boolean;
  connectionStatus: ManagedWhatsAppConnectionStatus;
  agentEnabled: boolean;
}

export interface ManagedWhatsAppSettingsResponse {
  settings: ManagedWhatsAppSettingsResult;
}

export interface ManagedWhatsAppConnectionPayloadResult {
  qrCodeBase64: string | null;
  pairingCode: string | null;
  expiresAt: string | null;
}

export interface ManagedWhatsAppConnectionPayloadResponse {
  settings: ManagedWhatsAppSettingsResult;
  connectionPayload: ManagedWhatsAppConnectionPayloadResult;
}
