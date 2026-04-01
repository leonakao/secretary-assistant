import type { Page, Route } from '@playwright/test';
import type {
  ManagedWhatsAppConnectionPayload,
  ManagedWhatsAppConnectionStatus,
  ManagedWhatsAppSettings,
  UpdateManagedAgentReplySettingsInput,
} from '../../../app/modules/settings/api/settings.api';
import {
  buildSettingsSessionUser,
  createSettingsOwnerIdentity,
  type SettingsSessionUserOptions,
} from './settings-auth';

type SettingsRoutePath =
  | '/companies/me/agent-reply-settings'
  | '/companies/me/agent-state'
  | '/companies/me/whatsapp-connection'
  | '/companies/me/whatsapp-disconnect'
  | '/companies/me/whatsapp-instance'
  | '/companies/me/whatsapp-refresh'
  | '/companies/me/whatsapp-settings'
  | '/users/me';

export interface SettingsMockRequestRecord {
  body: unknown;
  method: string;
  path: SettingsRoutePath;
}

export interface SettingsMockState {
  connectionPayload: ManagedWhatsAppConnectionPayload | null;
  nextConnectionError: Partial<Record<SettingsRoutePath, string>>;
  nextRefreshStatus: ManagedWhatsAppConnectionStatus | null;
  requestLog: SettingsMockRequestRecord[];
  sessionUser: ReturnType<typeof buildSettingsSessionUser>;
  settings: ManagedWhatsAppSettings;
}

export interface CreateSettingsMockStateOptions {
  connectionPayload?: ManagedWhatsAppConnectionPayload | null;
  sessionUser?: SettingsSessionUserOptions;
  settings?: Partial<ManagedWhatsAppSettings>;
}

const DEFAULT_CONNECTION_PAYLOAD: ManagedWhatsAppConnectionPayload = {
  expiresAt: '2026-03-30T23:59:59.000Z',
  pairingCode: null,
  qrCodeBase64:
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9H9n8AAAAASUVORK5CYII=',
};

export function createSettingsMockState(
  options: CreateSettingsMockStateOptions = {},
): SettingsMockState {
  const identity =
    options.sessionUser?.identity ?? createSettingsOwnerIdentity();
  const companyId = options.sessionUser?.companyId ?? 'company-settings-e2e';

  return {
    connectionPayload: options.connectionPayload ?? DEFAULT_CONNECTION_PAYLOAD,
    nextConnectionError: {},
    nextRefreshStatus: null,
    requestLog: [],
    sessionUser: buildSettingsSessionUser({
      ...options.sessionUser,
      companyId,
      identity,
    }),
    settings: {
      agentEnabled: false,
      agentReplyListEntries: [],
      agentReplyListMode: null,
      agentReplyNamePattern: null,
      agentReplyScope: 'all',
      companyId,
      connectionStatus: 'not-provisioned',
      evolutionInstanceName: null,
      hasProvisionedInstance: false,
      ...options.settings,
    },
  };
}

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({
    body: JSON.stringify(body),
    contentType: 'application/json',
    status,
  });
}

function recordRequest(state: SettingsMockState, route: Route, path: SettingsRoutePath) {
  state.requestLog.push({
    body: route.request().postData() ? route.request().postDataJSON() : null,
    method: route.request().method(),
    path,
  });
}

function consumeNextError(
  state: SettingsMockState,
  path: SettingsRoutePath,
): string | null {
  const message = state.nextConnectionError[path];

  if (!message) {
    return null;
  }

  delete state.nextConnectionError[path];
  return message;
}

function getInstanceName(companyId: string) {
  return `sa-company-${companyId}`;
}

export function getLastSettingsRequest(
  state: SettingsMockState,
  path: SettingsRoutePath,
): SettingsMockRequestRecord | undefined {
  return [...state.requestLog].reverse().find((entry) => entry.path === path);
}

export async function installSettingsPageMocks(
  page: Page,
  state: SettingsMockState,
): Promise<void> {
  await page.route('**/users/me', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    recordRequest(state, route, '/users/me');
    await json(route, 200, state.sessionUser);
  });

  await page.route('**/companies/me/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname as SettingsRoutePath;

    if (
      pathname !== '/companies/me/whatsapp-settings' &&
      pathname !== '/companies/me/whatsapp-instance' &&
      pathname !== '/companies/me/whatsapp-connection' &&
      pathname !== '/companies/me/whatsapp-refresh' &&
      pathname !== '/companies/me/agent-state' &&
      pathname !== '/companies/me/agent-reply-settings' &&
      pathname !== '/companies/me/whatsapp-disconnect'
    ) {
      await route.fallback();
      return;
    }

    recordRequest(state, route, pathname);

    const nextError = consumeNextError(state, pathname);
    if (nextError) {
      await json(route, 500, { message: nextError });
      return;
    }

    if (
      pathname === '/companies/me/whatsapp-settings' &&
      route.request().method() === 'GET'
    ) {
      await json(route, 200, { settings: state.settings });
      return;
    }

    if (
      pathname === '/companies/me/whatsapp-instance' &&
      route.request().method() === 'POST'
    ) {
      state.settings = {
        ...state.settings,
        connectionStatus:
          state.settings.connectionStatus === 'not-provisioned'
            ? 'disconnected'
            : state.settings.connectionStatus,
        evolutionInstanceName:
          state.settings.evolutionInstanceName ??
          getInstanceName(state.settings.companyId),
        hasProvisionedInstance: true,
      };
      await json(route, 200, { settings: state.settings });
      return;
    }

    if (
      pathname === '/companies/me/whatsapp-connection' &&
      route.request().method() === 'POST'
    ) {
      state.settings = {
        ...state.settings,
        connectionStatus: 'connecting',
        evolutionInstanceName:
          state.settings.evolutionInstanceName ??
          getInstanceName(state.settings.companyId),
        hasProvisionedInstance: true,
      };
      await json(route, 200, {
        connectionPayload: state.connectionPayload ?? DEFAULT_CONNECTION_PAYLOAD,
        settings: state.settings,
      });
      return;
    }

    if (
      pathname === '/companies/me/whatsapp-refresh' &&
      route.request().method() === 'POST'
    ) {
      state.settings = {
        ...state.settings,
        connectionStatus:
          state.nextRefreshStatus ??
          (state.settings.connectionStatus === 'connecting'
            ? 'connected'
            : state.settings.connectionStatus),
      };
      state.nextRefreshStatus = null;
      await json(route, 200, { settings: state.settings });
      return;
    }

    if (
      pathname === '/companies/me/agent-state' &&
      route.request().method() === 'POST'
    ) {
      const payload = route.request().postDataJSON() as { enabled: boolean };
      state.settings = {
        ...state.settings,
        agentEnabled: payload.enabled,
      };
      await json(route, 200, { settings: state.settings });
      return;
    }

    if (
      pathname === '/companies/me/agent-reply-settings' &&
      route.request().method() === 'POST'
    ) {
      const payload =
        route.request().postDataJSON() as UpdateManagedAgentReplySettingsInput;
      state.settings = {
        ...state.settings,
        agentReplyListEntries: payload.listEntries,
        agentReplyListMode: payload.listMode,
        agentReplyNamePattern: payload.namePattern,
        agentReplyScope: payload.scope,
      };
      await json(route, 200, { settings: state.settings });
      return;
    }

    if (
      pathname === '/companies/me/whatsapp-disconnect' &&
      route.request().method() === 'POST'
    ) {
      state.settings = {
        ...state.settings,
        connectionStatus: 'disconnected',
        hasProvisionedInstance: true,
      };
      state.connectionPayload = null;
      await json(route, 200, { settings: state.settings });
      return;
    }

    await route.fallback();
  });
}
