import type { APIRequestContext, APIResponse } from '@playwright/test';
import type {
  ManagedWhatsAppConnectionPayloadResponse,
  ManagedWhatsAppSettingsResponse,
  UpdateManagedAgentReplySettingsInput,
  UpdateManagedAgentStateInput,
} from '../../../app/modules/settings/api/settings.api';
import {
  createSettingsAuthHeaders,
  createSettingsOwnerIdentity,
  type E2EIdentity,
} from './settings-auth';

export interface SettingsWebhookMessageInput {
  fromMe?: boolean;
  instanceName?: string;
  messageId?: string;
  pushName?: string;
  remoteJid: string;
  text: string;
  timestamp?: number;
}

export interface SettingsApiClientOptions {
  apiBaseUrl?: string;
  evolutionWebhookToken?: string;
  identity?: E2EIdentity;
}

export interface ConversationResponse {
  message: string;
}

export interface SettingsWebhookRequestBody {
  data: {
    key: {
      fromMe: boolean;
      id: string;
      remoteJid: string;
    };
    message: {
      conversation: string;
    };
    messageTimestamp: number;
    pushName?: string;
  };
  instance: string;
}

async function parseJson<T>(response: APIResponse): Promise<T> {
  if (!response.ok()) {
    throw new Error(
      `Settings API request failed: ${response.status()} ${response.statusText()}`,
    );
  }

  return (await response.json()) as T;
}

export function createSettingsApiClient(
  request: APIRequestContext,
  options: SettingsApiClientOptions = {},
) {
  const apiBaseUrl =
    options.apiBaseUrl ?? process.env.API_BASE_URL ?? 'http://127.0.0.1:3300';
  const evolutionWebhookToken =
    options.evolutionWebhookToken ?? process.env.EVOLUTION_API_TOKEN;
  const identity = options.identity ?? createSettingsOwnerIdentity();
  let webhookSequence = 0;

  const requestJson = async <T>(
    path: string,
    init: {
      data?: unknown;
      headers?: Record<string, string>;
      method?: 'GET' | 'POST';
      withAuth?: boolean;
    } = {},
  ) => {
    const response = await request.fetch(`${apiBaseUrl}${path}`, {
      data: init.data,
      headers: init.withAuth === false
        ? init.headers
        : {
            ...createSettingsAuthHeaders(identity),
            ...init.headers,
          },
      method: init.method ?? 'GET',
    });

    return parseJson<T>(response);
  };

  return {
    getIdentity() {
      return identity;
    },
    getManagedWhatsAppSettings() {
      return requestJson<ManagedWhatsAppSettingsResponse>(
        '/companies/me/whatsapp-settings',
      );
    },
    getUsersMe() {
      return requestJson('/users/me');
    },
    provisionManagedWhatsAppInstance() {
      return requestJson<ManagedWhatsAppSettingsResponse>(
        '/companies/me/whatsapp-instance',
        { method: 'POST' },
      );
    },
    refreshManagedWhatsAppStatus() {
      return requestJson<ManagedWhatsAppSettingsResponse>(
        '/companies/me/whatsapp-refresh',
        { method: 'POST' },
      );
    },
    requestManagedWhatsAppConnectionPayload() {
      return requestJson<ManagedWhatsAppConnectionPayloadResponse>(
        '/companies/me/whatsapp-connection',
        { method: 'POST' },
      );
    },
    sendEvolutionMessage(companyId: string, input: SettingsWebhookMessageInput) {
      webhookSequence += 1;

      return requestJson<ConversationResponse>(
        `/webhooks/evolution/${companyId}/messages-upsert`,
        {
          data: buildSettingsWebhookRequestBody(
            companyId,
            input,
            webhookSequence,
          ),
          headers: evolutionWebhookToken
            ? { 'x-evolution-token': evolutionWebhookToken }
            : undefined,
          method: 'POST',
          withAuth: false,
        },
      );
    },
    updateManagedAgentReplySettings(input: UpdateManagedAgentReplySettingsInput) {
      return requestJson<ManagedWhatsAppSettingsResponse>(
        '/companies/me/agent-reply-settings',
        {
          data: input,
          method: 'POST',
        },
      );
    },
    updateManagedAgentState(input: UpdateManagedAgentStateInput) {
      return requestJson<ManagedWhatsAppSettingsResponse>(
        '/companies/me/agent-state',
        {
          data: input,
          method: 'POST',
        },
      );
    },
    whatsappDisconnect() {
      return requestJson<ManagedWhatsAppSettingsResponse>(
        '/companies/me/whatsapp-disconnect',
        { method: 'POST' },
      );
    },
  };
}

export function buildSettingsWebhookRequestBody(
  companyId: string,
  input: SettingsWebhookMessageInput,
  sequence = 1,
): SettingsWebhookRequestBody {
  return {
    data: {
      key: {
        fromMe: input.fromMe ?? false,
        id: input.messageId ?? `settings-e2e-${companyId}-${sequence}`,
        remoteJid: input.remoteJid,
      },
      message: {
        conversation: input.text,
      },
      messageTimestamp: input.timestamp ?? 1_762_400_000 + sequence,
      pushName: input.pushName,
    },
    instance: input.instanceName ?? `settings-e2e-${companyId}`,
  };
}
