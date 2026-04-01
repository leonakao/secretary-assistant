import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import {
  createSettingsApiClient,
  type SettingsWebhookMessageInput,
} from './support/settings-api';
import { createSettingsOwnerIdentity } from './support/settings-auth';
import { prepareSettingsDbScenario } from './support/settings-db';

function readEnvValueFromFile(filePath: string, key: string): string | null {
  if (!existsSync(filePath)) {
    return null;
  }

  const content = readFileSync(filePath, 'utf8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    if (trimmed.slice(0, separatorIndex) !== key) {
      continue;
    }

    return trimmed.slice(separatorIndex + 1);
  }

  return null;
}

function resolveEvolutionWebhookToken(): string | undefined {
  return (
    process.env.EVOLUTION_API_TOKEN ||
    readEnvValueFromFile(join(process.cwd(), '../api/.env'), 'EVOLUTION_API_TOKEN') ||
    readEnvValueFromFile(join(process.cwd(), '.env.test'), 'EVOLUTION_API_TOKEN') ||
    undefined
  );
}

function hasPositiveReplyInfrastructure(): boolean {
  return Boolean(
    process.env.GOOGLE_API_KEY ||
      readEnvValueFromFile(join(process.cwd(), '../api/.env'), 'GOOGLE_API_KEY') ||
      readEnvValueFromFile(join(process.cwd(), '.env.test'), 'GOOGLE_API_KEY'),
  );
}

function buildWebhookMessage(
  overrides: Partial<SettingsWebhookMessageInput> = {},
): SettingsWebhookMessageInput {
  return {
    remoteJid: '5511999999999@s.whatsapp.net',
    text: 'Oi, preciso de ajuda',
    ...overrides,
  };
}

function createApiScenarioContext(params: {
  agentEnabled?: boolean;
  contacts: Array<{ name: string; phone: string }>;
  identityKey: string;
  identityName: string;
  identitySub: string;
  replyListEntries?: string[];
  replyListMode?: 'blacklist' | 'whitelist' | null;
  replyNamePattern?: string | null;
  replyScope?: 'all' | 'specific';
}) {
  const identity = createSettingsOwnerIdentity({
    key: params.identityKey,
    name: params.identityName,
    sub: params.identitySub,
  });

  return {
    identity,
    scenario: prepareSettingsDbScenario({
      agentEnabled: params.agentEnabled,
      contacts: params.contacts,
      identity,
      replyListEntries: params.replyListEntries,
      replyListMode: params.replyListMode,
      replyNamePattern: params.replyNamePattern,
      replyScope: params.replyScope ?? 'all',
    }),
  };
}

test.describe('settings API integration', () => {
  test('persists agent settings through the real API and blocks replies when the agent is disabled', async ({
    request,
  }) => {
    const { identity, scenario } = createApiScenarioContext({
      contacts: [
        {
          name: 'Cliente VIP Maria',
          phone: '+5511999999999',
        },
      ],
      identityKey: 'settings-api-disabled',
      identityName: 'Settings API Disabled',
      identitySub: 'e2e|settings|api-disabled',
      replyScope: 'all',
    });
    const client = createSettingsApiClient(request, {
      evolutionWebhookToken: resolveEvolutionWebhookToken(),
      identity,
    });

    const initialSettings = await client.getManagedWhatsAppSettings();
    expect(initialSettings.settings.agentEnabled).toBe(false);
    expect(initialSettings.settings.agentReplyScope).toBe('all');

    await client.updateManagedAgentState({ enabled: false });

    const disabledResponse = await client.sendEvolutionMessage(
      scenario.companyId,
      buildWebhookMessage(),
    );
    expect(disabledResponse.message).toBe('');
  });

  test('persists all-scope settings through the real API', async ({ request }) => {
    const { identity } = createApiScenarioContext({
      agentEnabled: true,
      contacts: [
        {
          name: 'Cliente VIP Maria',
          phone: '+5511999999999',
        },
      ],
      identityKey: 'settings-api-all',
      identityName: 'Settings API All',
      identitySub: 'e2e|settings|api-all',
      replyScope: 'specific',
    });
    const client = createSettingsApiClient(request, {
      evolutionWebhookToken: resolveEvolutionWebhookToken(),
      identity,
    });

    await client.updateManagedAgentReplySettings({
      listEntries: [],
      listMode: null,
      namePattern: null,
      scope: 'all',
    });

    const settings = await client.getManagedWhatsAppSettings();
    expect(settings.settings.agentReplyScope).toBe('all');
    expect(settings.settings.agentReplyNamePattern).toBeNull();
    expect(settings.settings.agentReplyListMode).toBeNull();
    expect(settings.settings.agentReplyListEntries).toEqual([]);
  });

  test('blocks replies for specific scope with no filters', async ({ request }) => {
    const { identity, scenario } = createApiScenarioContext({
      agentEnabled: true,
      contacts: [
        {
          name: 'Cliente VIP Maria',
          phone: '+5511999999999',
        },
      ],
      identityKey: 'settings-api-specific-empty',
      identityName: 'Settings API Specific Empty',
      identitySub: 'e2e|settings|api-specific-empty',
      replyScope: 'all',
    });
    const client = createSettingsApiClient(request, {
      evolutionWebhookToken: resolveEvolutionWebhookToken(),
      identity,
    });

    await client.updateManagedAgentReplySettings({
      listEntries: [],
      listMode: null,
      namePattern: null,
      scope: 'specific',
    });

    const settings = await client.getManagedWhatsAppSettings();
    expect(settings.settings.agentReplyScope).toBe('specific');
    expect(settings.settings.agentReplyNamePattern).toBeNull();
    expect(settings.settings.agentReplyListMode).toBeNull();
    expect(settings.settings.agentReplyListEntries).toEqual([]);

    const response = await client.sendEvolutionMessage(
      scenario.companyId,
      buildWebhookMessage(),
    );
    expect(response.message).toBe('');
  });

  test('blocks replies when the saved name-pattern filter does not match', async ({
    request,
  }) => {
    const { identity, scenario } = createApiScenarioContext({
      agentEnabled: true,
      contacts: [
        {
          name: 'Maria Silva',
          phone: '+5511999999999',
        },
      ],
      identityKey: 'settings-api-name-pattern',
      identityName: 'Settings API Name Pattern',
      identitySub: 'e2e|settings|api-name-pattern',
      replyScope: 'all',
    });
    const client = createSettingsApiClient(request, {
      evolutionWebhookToken: resolveEvolutionWebhookToken(),
      identity,
    });

    await client.updateManagedAgentReplySettings({
      listEntries: [],
      listMode: null,
      namePattern: 'cliente',
      scope: 'specific',
    });

    const settings = await client.getManagedWhatsAppSettings();
    expect(settings.settings.agentReplyScope).toBe('specific');
    expect(settings.settings.agentReplyNamePattern).toBe('cliente');
    expect(settings.settings.agentReplyListMode).toBeNull();
    expect(settings.settings.agentReplyListEntries).toEqual([]);

    const response = await client.sendEvolutionMessage(
      scenario.companyId,
      buildWebhookMessage(),
    );
    expect(response.message).toBe('');
  });

  test('blocks replies when the saved whitelist filter does not match', async ({
    request,
  }) => {
    const { identity, scenario } = createApiScenarioContext({
      agentEnabled: true,
      contacts: [
        {
          name: 'Maria Silva',
          phone: '+5511999999999',
        },
      ],
      identityKey: 'settings-api-whitelist',
      identityName: 'Settings API Whitelist',
      identitySub: 'e2e|settings|api-whitelist',
      replyScope: 'all',
    });
    const client = createSettingsApiClient(request, {
      evolutionWebhookToken: resolveEvolutionWebhookToken(),
      identity,
    });

    await client.updateManagedAgentReplySettings({
      listEntries: ['vip'],
      listMode: 'whitelist',
      namePattern: null,
      scope: 'specific',
    });

    const settings = await client.getManagedWhatsAppSettings();
    expect(settings.settings.agentReplyListMode).toBe('whitelist');
    expect(settings.settings.agentReplyListEntries).toEqual(['vip']);

    const response = await client.sendEvolutionMessage(
      scenario.companyId,
      buildWebhookMessage(),
    );
    expect(response.message).toBe('');
  });

  test('blocks replies when the saved blacklist filter matches the contact', async ({
    request,
  }) => {
    const { identity, scenario } = createApiScenarioContext({
      agentEnabled: true,
      contacts: [
        {
          name: 'Maria Silva',
          phone: '+5511999999999',
        },
      ],
      identityKey: 'settings-api-blacklist',
      identityName: 'Settings API Blacklist',
      identitySub: 'e2e|settings|api-blacklist',
      replyScope: 'all',
    });
    const client = createSettingsApiClient(request, {
      evolutionWebhookToken: resolveEvolutionWebhookToken(),
      identity,
    });

    await client.updateManagedAgentReplySettings({
      listEntries: ['maria'],
      listMode: 'blacklist',
      namePattern: null,
      scope: 'specific',
    });

    const settings = await client.getManagedWhatsAppSettings();
    expect(settings.settings.agentReplyListMode).toBe('blacklist');
    expect(settings.settings.agentReplyListEntries).toEqual(['maria']);

    const response = await client.sendEvolutionMessage(
      scenario.companyId,
      buildWebhookMessage(),
    );
    expect(response.message).toBe('');
  });

  test.describe('positive reply behavior', () => {
    test.skip(
      !hasPositiveReplyInfrastructure(),
      'positive webhook reply cases require deterministic AI credentials in onboarding-validation',
    );

    test('allows replies when scope is all', async ({ request }) => {
      const { identity, scenario } = createApiScenarioContext({
        agentEnabled: true,
        contacts: [
          {
            name: 'Cliente VIP Maria',
            phone: '+5511999999999',
          },
        ],
        identityKey: 'settings-api-positive-all',
        identityName: 'Settings API Positive All',
        identitySub: 'e2e|settings|api-positive-all',
        replyScope: 'all',
      });
      const client = createSettingsApiClient(request, {
        evolutionWebhookToken: resolveEvolutionWebhookToken(),
        identity,
      });

      const response = await client.sendEvolutionMessage(
        scenario.companyId,
        buildWebhookMessage(),
      );

      expect(response.message).not.toBe('');
    });

    test('allows replies when the saved name-pattern filter matches', async ({
      request,
    }) => {
      const { identity, scenario } = createApiScenarioContext({
        agentEnabled: true,
        contacts: [
          {
            name: 'Cliente VIP Maria',
            phone: '+5511999999999',
          },
        ],
        identityKey: 'settings-api-positive-name-pattern',
        identityName: 'Settings API Positive Name Pattern',
        identitySub: 'e2e|settings|api-positive-name-pattern',
        replyNamePattern: 'cliente',
        replyScope: 'specific',
      });
      const client = createSettingsApiClient(request, {
        evolutionWebhookToken: resolveEvolutionWebhookToken(),
        identity,
      });

      const response = await client.sendEvolutionMessage(
        scenario.companyId,
        buildWebhookMessage(),
      );

      expect(response.message).not.toBe('');
    });

    test('allows replies when the saved whitelist filter matches', async ({
      request,
    }) => {
      const { identity, scenario } = createApiScenarioContext({
        agentEnabled: true,
        contacts: [
          {
            name: 'Cliente VIP Maria',
            phone: '+5511999999999',
          },
        ],
        identityKey: 'settings-api-positive-whitelist',
        identityName: 'Settings API Positive Whitelist',
        identitySub: 'e2e|settings|api-positive-whitelist',
        replyListEntries: ['vip'],
        replyListMode: 'whitelist',
        replyScope: 'specific',
      });
      const client = createSettingsApiClient(request, {
        evolutionWebhookToken: resolveEvolutionWebhookToken(),
        identity,
      });

      const response = await client.sendEvolutionMessage(
        scenario.companyId,
        buildWebhookMessage(),
      );

      expect(response.message).not.toBe('');
    });

    test('allows replies when the saved blacklist filter does not match', async ({
      request,
    }) => {
      const { identity, scenario } = createApiScenarioContext({
        agentEnabled: true,
        contacts: [
          {
            name: 'Cliente VIP Maria',
            phone: '+5511999999999',
          },
        ],
        identityKey: 'settings-api-positive-blacklist',
        identityName: 'Settings API Positive Blacklist',
        identitySub: 'e2e|settings|api-positive-blacklist',
        replyListEntries: ['bloqueado'],
        replyListMode: 'blacklist',
        replyScope: 'specific',
      });
      const client = createSettingsApiClient(request, {
        evolutionWebhookToken: resolveEvolutionWebhookToken(),
        identity,
      });

      const response = await client.sendEvolutionMessage(
        scenario.companyId,
        buildWebhookMessage(),
      );

      expect(response.message).not.toBe('');
    });
  });
});
