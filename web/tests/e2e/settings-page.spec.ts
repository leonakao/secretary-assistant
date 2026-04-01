import { expect, test } from '@playwright/test';
import {
  authenticateSettingsPage,
  createSettingsOwnerIdentity,
} from './support/settings-auth';
import {
  createSettingsMockState,
  getLastSettingsRequest,
  installSettingsPageMocks,
} from './support/settings-mocks';
import { captureSettingsSnapshot } from './support/settings-snapshots';

function expectRequestLogged(
  state: ReturnType<typeof createSettingsMockState>,
  path: Parameters<typeof getLastSettingsRequest>[1],
) {
  expect(getLastSettingsRequest(state, path)).toMatchObject({
    method: path === '/users/me' || path === '/companies/me/whatsapp-settings'
      ? 'GET'
      : 'POST',
    path,
  });
}

async function openSettingsPage(
  page: Parameters<typeof authenticateSettingsPage>[0],
  state: ReturnType<typeof createSettingsMockState>,
) {
  const identity = createSettingsOwnerIdentity({
    key: state.settings.companyId,
    sub: state.sessionUser.authProviderId ?? undefined,
  });

  await authenticateSettingsPage(page, identity);
  await installSettingsPageMocks(page, state);
  await page.goto('/app/settings');
  await expect(page.getByTestId('settings-page')).toBeVisible();
}

test.describe('settings page UI', () => {
  test('renders the delivered settings controls for a new company', async ({
    page,
  }, testInfo) => {
    const state = createSettingsMockState({
      settings: {
        agentEnabled: false,
        connectionStatus: 'not-provisioned',
      },
    });

    await openSettingsPage(page, state);
    expectRequestLogged(state, '/users/me');
    expectRequestLogged(state, '/companies/me/whatsapp-settings');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Configurações do app' }),
    ).toBeVisible();
    await expect(page.getByText('WhatsApp do agente')).toBeVisible();
    await expect(page.getByText('Estado e respostas do agente')).toBeVisible();
    await expect(page.getByText('WhatsApp ainda não configurado')).toBeVisible();
    await expect(
      page.getByTestId('whatsapp-settings-agent-enabled-label'),
    ).toHaveText('Desligado');
    await expect(page.getByTestId('whatsapp-settings-connect-button')).toBeVisible();
    // Reply settings are hidden when agent is disabled
    await expect(page.getByTestId('agent-reply-scope-all')).toBeHidden();
    await expect(page.getByTestId('agent-reply-name-pattern-input')).toBeHidden();
    await expect(
      page.getByTestId('agent-reply-list-entries-textarea'),
    ).toBeHidden();

    await captureSettingsSnapshot({
      name: 'settings-initial',
      page,
      testInfo,
    });
    await captureSettingsSnapshot({
      name: 'settings-whatsapp-not-provisioned',
      page,
      testInfo,
    });
    await captureSettingsSnapshot({
      name: 'settings-agent-disabled',
      page,
      testInfo,
    });
  });

  test('covers WhatsApp lifecycle and agent toggle with mocked settings state', async ({
    page,
  }, testInfo) => {
    const state = createSettingsMockState({
      settings: {
        agentEnabled: false,
        connectionStatus: 'not-provisioned',
      },
    });

    await openSettingsPage(page, state);
    expectRequestLogged(state, '/companies/me/whatsapp-settings');

    await page.getByTestId('whatsapp-settings-connect-button').click();

    await expect(page.getByText('Aguardando conexão')).toBeVisible();
    await expect(
      page.getByTestId('whatsapp-settings-connection-payload'),
    ).toBeVisible();
    expectRequestLogged(state, '/companies/me/whatsapp-instance');
    expectRequestLogged(state, '/companies/me/whatsapp-connection');

    await captureSettingsSnapshot({
      name: 'settings-whatsapp-connecting',
      page,
      testInfo,
    });

    await page.getByTestId('whatsapp-settings-refresh-button').click();

    await expect(page.getByText('WhatsApp conectado')).toBeVisible();
    expectRequestLogged(state, '/companies/me/whatsapp-refresh');

    await captureSettingsSnapshot({
      name: 'settings-whatsapp-connected',
      page,
      testInfo,
    });

    await page.getByTestId('whatsapp-settings-agent-toggle-button').click();

    await expect(
      page.getByTestId('whatsapp-settings-agent-enabled-label'),
    ).toHaveText('Ligado');
    await expect(page.getByText('WhatsApp conectado')).toBeVisible();
    await expect(page.getByTestId('whatsapp-settings-refresh-button')).toBeVisible();
    expect(
      getLastSettingsRequest(state, '/companies/me/agent-state')?.body,
    ).toEqual({ enabled: true });

    await page.getByTestId('whatsapp-settings-disconnect-button').click();

    await expect(page.getByText('WhatsApp desconectado')).toBeVisible();
    await expect(page.getByTestId('whatsapp-settings-connect-button')).toBeVisible();
    expectRequestLogged(state, '/companies/me/whatsapp-disconnect');
  });

  test('covers reply-rule variants, persistence after reload, and recoverable page errors', async ({
    page,
  }, testInfo) => {
    const state = createSettingsMockState({
      settings: {
        agentEnabled: false,
        connectionStatus: 'unknown',
        evolutionInstanceName: 'sa-company-company-settings-e2e',
        hasProvisionedInstance: true,
      },
    });

    await openSettingsPage(page, state);

    await expect(page.getByText('Status indisponível')).toBeVisible();

    await page.getByTestId('whatsapp-settings-agent-toggle-button').click();
    await expect(
      page.getByTestId('whatsapp-settings-agent-enabled-label'),
    ).toHaveText('Ligado');

    await page.getByTestId('agent-reply-scope-specific').click();
    await expect(
      page.getByTestId('agent-reply-specific-empty-hint'),
    ).toBeVisible();
    await captureSettingsSnapshot({
      name: 'settings-reply-scope-specific',
      page,
      testInfo,
    });

    await page.getByTestId('agent-reply-name-pattern-input').fill('cliente');
    await page.getByTestId('agent-reply-list-mode-whitelist').click();
    await page
      .getByTestId('agent-reply-list-entries-textarea')
      .fill('vip\nprioridade');

    const replySettingsResponse1 = page.waitForResponse('**/companies/me/agent-reply-settings');
    await page.getByTestId('agent-reply-save-button').click();
    await replySettingsResponse1;

    expect(
      getLastSettingsRequest(state, '/companies/me/agent-reply-settings')?.body,
    ).toEqual({
      listEntries: ['vip', 'prioridade'],
      listMode: 'whitelist',
      namePattern: 'cliente',
      scope: 'specific',
    });

    await expect(page.getByTestId('agent-reply-scope-specific')).toBeChecked();
    await expect(page.getByTestId('agent-reply-name-pattern-input')).toHaveValue(
      'cliente',
    );
    await expect(
      page.getByTestId('agent-reply-list-mode-whitelist'),
    ).toBeChecked();
    await expect(
      page.getByTestId('agent-reply-list-entries-textarea'),
    ).toHaveValue('vip\nprioridade');

    await page.getByTestId('agent-reply-scope-all').click();

    const replySettingsResponse2 = page.waitForResponse('**/companies/me/agent-reply-settings');
    await page.getByTestId('agent-reply-save-button').click();
    await replySettingsResponse2;

    expect(
      getLastSettingsRequest(state, '/companies/me/agent-reply-settings')?.body,
    ).toEqual({
      listEntries: ['vip', 'prioridade'],
      listMode: 'whitelist',
      namePattern: 'cliente',
      scope: 'all',
    });
    await expect(page.getByTestId('agent-reply-scope-all')).toBeChecked();

    await page.getByTestId('agent-reply-scope-specific').click();

    const replySettingsResponse3 = page.waitForResponse('**/companies/me/agent-reply-settings');
    await page.getByTestId('agent-reply-save-button').click();
    await replySettingsResponse3;

    expect(
      getLastSettingsRequest(state, '/companies/me/agent-reply-settings')?.body,
    ).toEqual({
      listEntries: ['vip', 'prioridade'],
      listMode: 'whitelist',
      namePattern: 'cliente',
      scope: 'specific',
    });

    await captureSettingsSnapshot({
      name: 'settings-whitelist',
      page,
      testInfo,
    });

    await page.getByTestId('agent-reply-list-mode-blacklist').click();

    const replySettingsResponse4 = page.waitForResponse('**/companies/me/agent-reply-settings');
    await page.getByTestId('agent-reply-save-button').click();
    await replySettingsResponse4;

    expect(
      getLastSettingsRequest(state, '/companies/me/agent-reply-settings')?.body,
    ).toEqual({
      listEntries: ['vip', 'prioridade'],
      listMode: 'blacklist',
      namePattern: 'cliente',
      scope: 'specific',
    });

    await expect(
      page.getByTestId('agent-reply-list-mode-blacklist'),
    ).toBeChecked();

    await captureSettingsSnapshot({
      name: 'settings-blacklist',
      page,
      testInfo,
    });

    await page.reload();
    await expect(page.getByTestId('settings-page')).toBeVisible();
    await expect(page.getByTestId('agent-reply-scope-specific')).toBeChecked();
    await expect(page.getByTestId('agent-reply-name-pattern-input')).toHaveValue(
      'cliente',
    );
    await expect(
      page.getByTestId('agent-reply-list-mode-blacklist'),
    ).toBeChecked();

    state.nextConnectionError['/companies/me/whatsapp-refresh'] =
      'Falha ao atualizar o status.';
    await page.getByTestId('whatsapp-settings-refresh-button').click();
    await expect(
      page.getByTestId('whatsapp-settings-connection-error'),
    ).toContainText('Falha ao atualizar o status.');

    state.nextConnectionError['/companies/me/agent-state'] =
      'Falha ao atualizar o estado do agente.';
    await page.getByTestId('whatsapp-settings-agent-toggle-button').click();
    await expect(
      page.getByTestId('whatsapp-settings-agent-state-error'),
    ).toContainText('Falha ao atualizar o estado do agente.');

    await page.getByTestId('whatsapp-settings-agent-toggle-button').click();
    await expect(
      page.getByTestId('whatsapp-settings-agent-state-error'),
    ).toBeHidden();
    await expect(
      page.getByTestId('whatsapp-settings-agent-enabled-label'),
    ).toHaveText('Desligado');
  });
});
