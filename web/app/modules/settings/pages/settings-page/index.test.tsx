import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoundApiClient } from '~/lib/api-client-context';
import type { ManagedWhatsAppSettings } from '../../api/settings.api';

const {
  mockClient,
  disconnectManagedWhatsAppMock,
  getManagedWhatsAppConnectionPayloadMock,
  getManagedWhatsAppSettingsMock,
  provisionManagedWhatsAppInstanceMock,
  refreshManagedWhatsAppStatusMock,
  updateManagedAgentReplySettingsMock,
  updateManagedAgentStateMock,
} = vi.hoisted(() => ({
  mockClient: {} as BoundApiClient,
  disconnectManagedWhatsAppMock: vi.fn(),
  getManagedWhatsAppConnectionPayloadMock: vi.fn(),
  getManagedWhatsAppSettingsMock: vi.fn(),
  provisionManagedWhatsAppInstanceMock: vi.fn(),
  refreshManagedWhatsAppStatusMock: vi.fn(),
  updateManagedAgentReplySettingsMock: vi.fn(),
  updateManagedAgentStateMock: vi.fn(),
}));

vi.mock('~/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: Record<string, unknown>) =>
    createElement('button', props, children as Parameters<typeof createElement>[2]),
}));

vi.mock('~/lib/api-client-context', () => ({
  useApiClient: () => mockClient,
}));

vi.mock('../../api/settings.api', async () => {
  const actual = await vi.importActual<typeof import('../../api/settings.api')>(
    '../../api/settings.api',
  );

  return {
    ...actual,
    disconnectManagedWhatsApp: disconnectManagedWhatsAppMock,
    getManagedWhatsAppConnectionPayload: getManagedWhatsAppConnectionPayloadMock,
    getManagedWhatsAppSettings: getManagedWhatsAppSettingsMock,
    provisionManagedWhatsAppInstance: provisionManagedWhatsAppInstanceMock,
    refreshManagedWhatsAppStatus: refreshManagedWhatsAppStatusMock,
    updateManagedAgentReplySettings: updateManagedAgentReplySettingsMock,
    updateManagedAgentState: updateManagedAgentStateMock,
  };
});

function makeSettings(
  overrides: Partial<ManagedWhatsAppSettings> = {},
): ManagedWhatsAppSettings {
  return {
    companyId: 'company-1',
    evolutionInstanceName: 'sa-company-company-1',
    hasProvisionedInstance: true,
    connectionStatus: 'connected',
    agentEnabled: true,
    agentReplyScope: 'all',
    agentReplyNamePattern: null,
    agentReplyListMode: null,
    agentReplyListEntries: [],
    ...overrides,
  };
}

beforeEach(() => {
  getManagedWhatsAppSettingsMock.mockReset();
  disconnectManagedWhatsAppMock.mockReset();
  getManagedWhatsAppConnectionPayloadMock.mockReset();
  provisionManagedWhatsAppInstanceMock.mockReset();
  refreshManagedWhatsAppStatusMock.mockReset();
  updateManagedAgentReplySettingsMock.mockReset();
  updateManagedAgentStateMock.mockReset();
});

describe('SettingsPage', () => {
  it('loads managed WhatsApp settings and renders the WhatsApp settings area', async () => {
    const { SettingsPage } = await import('./index');
    getManagedWhatsAppSettingsMock.mockResolvedValue({
      settings: makeSettings(),
    });

    render(<SettingsPage />);

    expect(screen.getByTestId('settings-page-skeleton')).toBeInTheDocument();

    await screen.findByRole('heading', {
      level: 1,
      name: 'Configurações do app',
    });

    expect(screen.getByText('WhatsApp do agente')).toBeInTheDocument();
    expect(
      screen.getByText('Estado e respostas do agente'),
    ).toBeInTheDocument();
    expect(getManagedWhatsAppSettingsMock).toHaveBeenCalledTimes(1);
    expect(
      screen.getByTestId('whatsapp-settings-agent-enabled-label'),
    ).toHaveTextContent('Ligado');
    expect(
      screen.queryByTestId('future-settings-placeholder'),
    ).not.toBeInTheDocument();
  });

  it('reuses the same in-flight initial settings request across a remount', async () => {
    const { SettingsPage } = await import('./index');

    let resolveSettings:
      | ((value: { settings: ManagedWhatsAppSettings }) => void)
      | null = null;

    getManagedWhatsAppSettingsMock.mockImplementation(
      () =>
        new Promise<{ settings: ManagedWhatsAppSettings }>((resolve) => {
          resolveSettings = resolve;
        }),
    );

    const firstRender = render(<SettingsPage />);
    firstRender.unmount();
    render(<SettingsPage />);

    expect(getManagedWhatsAppSettingsMock).toHaveBeenCalledTimes(1);

    const resolveInitialSettings = resolveSettings as
      | ((value: { settings: ManagedWhatsAppSettings }) => void)
      | null;

    if (resolveInitialSettings) {
      resolveInitialSettings({
        settings: makeSettings(),
      });
    }

    await screen.findByRole('heading', {
      level: 1,
      name: 'Configurações do app',
    });
  });

  it('renders a predictable load error state', async () => {
    const { SettingsPage } = await import('./index');
    getManagedWhatsAppSettingsMock.mockRejectedValue(
      new Error('Falha ao carregar.'),
    );

    render(<SettingsPage />);

    await screen.findByRole('heading', {
      level: 1,
      name: 'Não foi possível carregar a área de configurações',
    });

    expect(screen.getByText('Falha ao carregar.')).toBeInTheDocument();
  });

  it('renders the not-provisioned state with a single connect action', async () => {
    const { SettingsPage } = await import('./index');
    getManagedWhatsAppSettingsMock.mockResolvedValue({
      settings: makeSettings({
        evolutionInstanceName: null,
        hasProvisionedInstance: false,
        connectionStatus: 'not-provisioned',
        agentEnabled: false,
      }),
    });

    render(<SettingsPage />);

    await screen.findByText('WhatsApp ainda não configurado');

    expect(
      screen.getByTestId('whatsapp-settings-agent-enabled-label'),
    ).toHaveTextContent('Desligado');
    expect(screen.getByTestId('whatsapp-settings-connect-button')).toBeInTheDocument();
    expect(
      screen.queryByTestId('whatsapp-settings-disconnect-button'),
    ).not.toBeInTheDocument();
  });

  it('provisions and loads the connection payload through the same connect action', async () => {
    const { SettingsPage } = await import('./index');
    getManagedWhatsAppSettingsMock.mockResolvedValue({
      settings: makeSettings({
        evolutionInstanceName: null,
        hasProvisionedInstance: false,
        connectionStatus: 'not-provisioned',
      }),
    });
    provisionManagedWhatsAppInstanceMock.mockResolvedValue({
      settings: makeSettings({
        evolutionInstanceName: 'sa-company-company-1',
        hasProvisionedInstance: true,
        connectionStatus: 'disconnected',
      }),
    });
    getManagedWhatsAppConnectionPayloadMock.mockResolvedValue({
      settings: makeSettings({
        evolutionInstanceName: 'sa-company-company-1',
        hasProvisionedInstance: true,
        connectionStatus: 'connecting',
      }),
      connectionPayload: {
        qrCodeBase64: 'data:image/png;base64,base64-qr',
        pairingCode: 'PAIR-123',
        expiresAt: '2026-03-29T20:00:00Z',
      },
    });

    render(<SettingsPage />);

    await screen.findByText('WhatsApp ainda não configurado');

    fireEvent.click(screen.getByTestId('whatsapp-settings-connect-button'));

    await waitFor(() => {
      expect(provisionManagedWhatsAppInstanceMock).toHaveBeenCalledWith(
        mockClient,
      );
    });
    await waitFor(() => {
      expect(getManagedWhatsAppConnectionPayloadMock).toHaveBeenCalledWith(
        mockClient,
      );
    });

    await screen.findByText('Aguardando conexão');
    expect(
      screen.getByTestId('whatsapp-settings-connection-payload'),
    ).toBeInTheDocument();
  });

  it('shows a recoverable local error when connect preparation fails', async () => {
    const { SettingsPage } = await import('./index');
    getManagedWhatsAppSettingsMock.mockResolvedValue({
      settings: makeSettings({
        evolutionInstanceName: null,
        hasProvisionedInstance: false,
        connectionStatus: 'not-provisioned',
      }),
    });
    provisionManagedWhatsAppInstanceMock.mockRejectedValue(
      new Error('Falha ao provisionar.'),
    );

    render(<SettingsPage />);

    await screen.findByText('WhatsApp ainda não configurado');
    fireEvent.click(screen.getByTestId('whatsapp-settings-connect-button'));

    await screen.findByTestId('whatsapp-settings-connection-error');
    expect(screen.getByText('Falha ao provisionar.')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp ainda não configurado')).toBeInTheDocument();
  });

  it('loads and renders the connection payload only after explicit action', async () => {
    const { SettingsPage } = await import('./index');
    getManagedWhatsAppSettingsMock.mockResolvedValue({
      settings: makeSettings({
        connectionStatus: 'disconnected',
      }),
    });
    getManagedWhatsAppConnectionPayloadMock.mockResolvedValue({
      settings: makeSettings({
        connectionStatus: 'connecting',
      }),
      connectionPayload: {
        qrCodeBase64: 'data:image/png;base64,base64-qr',
        pairingCode: 'PAIR-123',
        expiresAt: '2026-03-29T20:00:00Z',
      },
    });

    render(<SettingsPage />);

    await screen.findByText('WhatsApp desconectado');
    expect(
      screen.queryByTestId('whatsapp-settings-connection-payload'),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('whatsapp-settings-connect-button'));

    await waitFor(() => {
      expect(getManagedWhatsAppConnectionPayloadMock).toHaveBeenCalledWith(
        mockClient,
      );
    });

    await screen.findByText('Aguardando conexão');
    expect(
      screen.getByTestId('whatsapp-settings-connection-payload'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('whatsapp-settings-qr-code')).toBeInTheDocument();
    expect(
      screen.queryByTestId('whatsapp-settings-pairing-code'),
    ).not.toBeInTheDocument();
  });

  it('refreshes the rendered WhatsApp status', async () => {
    const { SettingsPage } = await import('./index');
    getManagedWhatsAppSettingsMock.mockResolvedValue({
      settings: makeSettings({
        connectionStatus: 'connecting',
      }),
    });
    refreshManagedWhatsAppStatusMock.mockResolvedValue({
      settings: makeSettings({
        connectionStatus: 'connected',
      }),
    });

    render(<SettingsPage />);

    await screen.findByText('Aguardando conexão');
    fireEvent.click(screen.getByTestId('whatsapp-settings-refresh-button'));

    await waitFor(() => {
      expect(refreshManagedWhatsAppStatusMock).toHaveBeenCalledWith(mockClient);
    });

    await screen.findByText('WhatsApp conectado');
    expect(
      screen.queryByTestId('whatsapp-settings-connect-button'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('whatsapp-settings-disconnect-button'),
    ).toBeInTheDocument();
  });

  it('disconnects WhatsApp and clears the connection payload', async () => {
    const { SettingsPage } = await import('./index');
    getManagedWhatsAppSettingsMock.mockResolvedValue({
      settings: makeSettings({
        connectionStatus: 'disconnected',
      }),
    });
    getManagedWhatsAppConnectionPayloadMock.mockResolvedValue({
      settings: makeSettings({
        connectionStatus: 'connected',
      }),
      connectionPayload: {
        qrCodeBase64: 'data:image/png;base64,base64-qr',
        pairingCode: 'PAIR-123',
        expiresAt: '2026-03-29T20:00:00Z',
      },
    });
    disconnectManagedWhatsAppMock.mockResolvedValue({
      settings: makeSettings({
        connectionStatus: 'disconnected',
      }),
    });

    render(<SettingsPage />);

    await screen.findByText('WhatsApp desconectado');
    fireEvent.click(screen.getByTestId('whatsapp-settings-connect-button'));
    await screen.findByTestId('whatsapp-settings-connection-payload');
    await screen.findByText('WhatsApp conectado');

    fireEvent.click(screen.getByTestId('whatsapp-settings-disconnect-button'));

    await waitFor(() => {
      expect(disconnectManagedWhatsAppMock).toHaveBeenCalledWith(mockClient);
    });

    await screen.findByText('WhatsApp desconectado');
    expect(screen.getByTestId('whatsapp-settings-connect-button')).toBeInTheDocument();
    expect(
      screen.queryByTestId('whatsapp-settings-connection-payload'),
    ).not.toBeInTheDocument();
  });

  it('shows a recoverable local error for connection actions', async () => {
    const { SettingsPage } = await import('./index');
    getManagedWhatsAppSettingsMock.mockResolvedValue({
      settings: makeSettings({
        connectionStatus: 'disconnected',
      }),
    });
    getManagedWhatsAppConnectionPayloadMock.mockRejectedValue(
      new Error('Falha ao buscar o QR code.'),
    );

    render(<SettingsPage />);

    await screen.findByText('WhatsApp desconectado');
    fireEvent.click(screen.getByTestId('whatsapp-settings-connect-button'));

    await screen.findByTestId('whatsapp-settings-connection-error');
    expect(screen.getByText('Falha ao buscar o QR code.')).toBeInTheDocument();
    expect(
      screen.queryByTestId('whatsapp-settings-connection-payload'),
    ).not.toBeInTheDocument();
  });

  it('recovers on a second connection attempt after a local failure', async () => {
    const { SettingsPage } = await import('./index');
    getManagedWhatsAppSettingsMock.mockResolvedValue({
      settings: makeSettings({
        connectionStatus: 'disconnected',
      }),
    });
    getManagedWhatsAppConnectionPayloadMock
      .mockRejectedValueOnce(new Error('Falha ao buscar o QR code.'))
      .mockResolvedValueOnce({
        settings: makeSettings({
          connectionStatus: 'connecting',
        }),
        connectionPayload: {
          qrCodeBase64: 'data:image/png;base64,base64-qr',
          pairingCode: 'PAIR-456',
          expiresAt: '2026-03-29T20:15:00Z',
        },
      });

    render(<SettingsPage />);

    await screen.findByText('WhatsApp desconectado');

    fireEvent.click(screen.getByTestId('whatsapp-settings-connect-button'));

    await screen.findByTestId('whatsapp-settings-connection-error');
    expect(screen.getByText('Falha ao buscar o QR code.')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('whatsapp-settings-connect-button'));

    await screen.findByText('Aguardando conexão');
    expect(
      screen.queryByTestId('whatsapp-settings-connection-error'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('whatsapp-settings-connection-payload'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('whatsapp-settings-qr-code')).toBeInTheDocument();
    expect(
      screen.queryByTestId('whatsapp-settings-pairing-code'),
    ).not.toBeInTheDocument();
  });

  it('toggles the agent state without clearing the connection payload', async () => {
    const { SettingsPage } = await import('./index');
    getManagedWhatsAppSettingsMock.mockResolvedValue({
      settings: makeSettings({
        connectionStatus: 'connecting',
        agentEnabled: true,
      }),
    });
    getManagedWhatsAppConnectionPayloadMock.mockResolvedValue({
      settings: makeSettings({
        connectionStatus: 'connecting',
        agentEnabled: true,
      }),
      connectionPayload: {
        qrCodeBase64: 'data:image/png;base64,base64-qr',
        pairingCode: 'PAIR-123',
        expiresAt: '2026-03-29T20:00:00Z',
      },
    });
    updateManagedAgentStateMock.mockResolvedValue({
      settings: makeSettings({
        connectionStatus: 'connecting',
        agentEnabled: false,
      }),
    });

    render(<SettingsPage />);

    await screen.findByText('Aguardando conexão');
    fireEvent.click(screen.getByTestId('whatsapp-settings-connect-button'));
    await screen.findByTestId('whatsapp-settings-connection-payload');

    fireEvent.click(screen.getByTestId('whatsapp-settings-agent-toggle-button'));

    await waitFor(() => {
      expect(updateManagedAgentStateMock).toHaveBeenCalledWith(
        { enabled: false },
        mockClient,
      );
    });

    expect(
      screen.getByTestId('whatsapp-settings-connection-payload'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('whatsapp-settings-agent-enabled-label'),
    ).toHaveTextContent('Desligado');
    expect(
      screen.getByText(
        'Ligue o agente para configurar quem ele deve responder automaticamente.',
      ),
    ).toBeInTheDocument();
  });

  it('shows a recoverable local error when updating the agent state', async () => {
    const { SettingsPage } = await import('./index');
    getManagedWhatsAppSettingsMock.mockResolvedValue({
      settings: makeSettings({
        connectionStatus: 'connected',
        agentEnabled: true,
      }),
    });
    updateManagedAgentStateMock.mockRejectedValue(
      new Error('Falha ao atualizar o agente.'),
    );

    render(<SettingsPage />);

    await screen.findByText('WhatsApp conectado');
    fireEvent.click(screen.getByTestId('whatsapp-settings-agent-toggle-button'));

    await screen.findByTestId('whatsapp-settings-agent-state-error');
    expect(
      screen.getByText('Falha ao atualizar o agente.'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('whatsapp-settings-agent-enabled-label'),
    ).toHaveTextContent('Ligado');
  });

  it('updates the reply filters for specific contacts', async () => {
    const { SettingsPage } = await import('./index');
    getManagedWhatsAppSettingsMock.mockResolvedValue({
      settings: makeSettings({
        agentReplyScope: 'all',
      }),
    });
    updateManagedAgentReplySettingsMock.mockResolvedValue({
      settings: makeSettings({
        agentReplyScope: 'specific',
        agentReplyNamePattern: 'cliente',
        agentReplyListMode: 'whitelist',
        agentReplyListEntries: ['vip', 'prioridade'],
      }),
    });

    render(<SettingsPage />);

    await screen.findByText('Estado e respostas do agente');

    fireEvent.click(screen.getByTestId('agent-reply-scope-specific'));
    fireEvent.change(screen.getByTestId('agent-reply-name-pattern-input'), {
      target: { value: 'cliente' },
    });
    fireEvent.click(screen.getByTestId('agent-reply-list-mode-whitelist'));
    fireEvent.change(screen.getByTestId('agent-reply-list-entries-textarea'), {
      target: { value: 'vip\nprioridade' },
    });
    fireEvent.click(screen.getByTestId('agent-reply-save-button'));

    await waitFor(() => {
      expect(updateManagedAgentReplySettingsMock).toHaveBeenCalledWith(
        {
          scope: 'specific',
          namePattern: 'cliente',
          listMode: 'whitelist',
          listEntries: ['vip', 'prioridade'],
        },
        mockClient,
      );
    });

    expect(
      screen.getByTestId('agent-reply-list-entries-textarea'),
    ).toHaveValue('vip\nprioridade');
  });

  it('saves the all scope after switching back from specific contacts', async () => {
    const { SettingsPage } = await import('./index');
    getManagedWhatsAppSettingsMock.mockResolvedValue({
      settings: makeSettings({
        agentReplyScope: 'specific',
        agentReplyNamePattern: 'cliente',
        agentReplyListMode: 'whitelist',
        agentReplyListEntries: ['vip', 'prioridade'],
      }),
    });
    updateManagedAgentReplySettingsMock.mockResolvedValue({
      settings: makeSettings({
        agentReplyScope: 'all',
        agentReplyNamePattern: 'cliente',
        agentReplyListMode: 'whitelist',
        agentReplyListEntries: ['vip', 'prioridade'],
      }),
    });

    render(<SettingsPage />);

    await screen.findByText('Estado e respostas do agente');

    fireEvent.click(screen.getByTestId('agent-reply-scope-all'));
    fireEvent.click(screen.getByTestId('agent-reply-save-button'));

    await waitFor(() => {
      expect(updateManagedAgentReplySettingsMock).toHaveBeenCalledWith(
        {
          scope: 'all',
          namePattern: 'cliente',
          listMode: 'whitelist',
          listEntries: ['vip', 'prioridade'],
        },
        mockClient,
      );
    });
  });

  it('warns when specific-contact mode has no filters configured', async () => {
    const { SettingsPage } = await import('./index');
    getManagedWhatsAppSettingsMock.mockResolvedValue({
      settings: makeSettings({
        agentReplyScope: 'specific',
        agentReplyNamePattern: null,
        agentReplyListMode: null,
        agentReplyListEntries: [],
      }),
    });

    render(<SettingsPage />);

    await screen.findByText('Estado e respostas do agente');
    expect(
      screen.getByTestId('agent-reply-specific-empty-hint'),
    ).toBeInTheDocument();
  });
});
