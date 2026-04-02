import { useEffect, useEffectEvent, useState } from 'react';
import { useApiClient } from '~/lib/api-client-context';
import {
  disconnectManagedWhatsApp,
  getManagedWhatsAppConnectionPayload,
  getManagedWhatsAppSettings,
  refreshManagedWhatsAppStatus,
  provisionManagedWhatsAppInstance,
  updateManagedAgentReplySettings,
  updateManagedAgentState,
  type ManagedWhatsAppConnectionPayload,
  type ManagedWhatsAppSettings,
} from '../../api/settings.api';
import { AgentReplySettingsCard } from '../../components/agent-reply-settings-card';
import { SettingsPageSkeleton } from '../../components/settings-page-skeleton';
import { WhatsAppSettingsCard } from '../../components/whatsapp-settings-card';

let managedWhatsAppSettingsLoadPromise:
  | Promise<{ settings: ManagedWhatsAppSettings }>
  | null = null;

function loadManagedWhatsAppSettingsOnce(
  client: ReturnType<typeof useApiClient>,
): Promise<{ settings: ManagedWhatsAppSettings }> {
  if (!managedWhatsAppSettingsLoadPromise) {
    managedWhatsAppSettingsLoadPromise = getManagedWhatsAppSettings(client).finally(
      () => {
        managedWhatsAppSettingsLoadPromise = null;
      },
    );
  }

  return managedWhatsAppSettingsLoadPromise;
}

export function SettingsPage() {
  const client = useApiClient();
  const [settings, setSettings] = useState<ManagedWhatsAppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [connectionPayload, setConnectionPayload] =
    useState<ManagedWhatsAppConnectionPayload | null>(null);
  const [connectionActionError, setConnectionActionError] = useState<string | null>(
    null,
  );
  const [agentStateError, setAgentStateError] = useState<string | null>(null);
  const [agentReplySettingsError, setAgentReplySettingsError] = useState<string | null>(
    null,
  );
  const [isFetchingConnectionPayload, setIsFetchingConnectionPayload] =
    useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isUpdatingAgentState, setIsUpdatingAgentState] = useState(false);
  const [isUpdatingAgentReplySettings, setIsUpdatingAgentReplySettings] =
    useState(false);

  const loadInitialSettings = useEffectEvent(
    async (cancelled: { current: boolean }) => {
      try {
        const response = await loadManagedWhatsAppSettingsOnce(client);

        if (cancelled.current) {
          return;
        }

        setSettings(response.settings);
        setLoadError(null);
        setConnectionActionError(null);
        setAgentStateError(null);
        setAgentReplySettingsError(null);
        setIsLoading(false);
      } catch (cause: unknown) {
        if (cancelled.current) {
          return;
        }

        setLoadError(
          cause instanceof Error
            ? cause.message
            : 'Não foi possível carregar as configurações.',
        );
        setIsLoading(false);
      }
    },
  );

  useEffect(() => {
    const cancelled = { current: false };
    void loadInitialSettings(cancelled);

    return () => {
      cancelled.current = true;
    };
  }, []);

  const handleConnect = async () => {
    if (!settings) {
      return;
    }

    try {
      setIsFetchingConnectionPayload(true);
      setConnectionActionError(null);

      if (!settings.hasProvisionedInstance) {
        const provisionResponse = await provisionManagedWhatsAppInstance(client);
        setSettings(provisionResponse.settings);
      }

      const response = await getManagedWhatsAppConnectionPayload(client);
      setSettings(response.settings);
      setConnectionPayload(response.connectionPayload);
    } catch (cause: unknown) {
      setConnectionActionError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível iniciar a conexão do WhatsApp.',
      );
    } finally {
      setIsFetchingConnectionPayload(false);
    }
  };

  const handleRefreshStatus = async () => {
    try {
      setIsRefreshingStatus(true);
      setConnectionActionError(null);

      const response = await refreshManagedWhatsAppStatus(client);
      setSettings(response.settings);
    } catch (cause: unknown) {
      setConnectionActionError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível atualizar o status do WhatsApp.',
      );
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      setConnectionActionError(null);

      const response = await disconnectManagedWhatsApp(client);
      setSettings(response.settings);
      setConnectionPayload(null);
    } catch (cause: unknown) {
      setConnectionActionError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível desconectar o WhatsApp.',
      );
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleToggleAgentState = async () => {
    if (!settings) {
      return;
    }

    try {
      setIsUpdatingAgentState(true);
      setAgentStateError(null);

      const response = await updateManagedAgentState(
        { enabled: !settings.agentEnabled },
        client,
      );
      setSettings(response.settings);
    } catch (cause: unknown) {
      setAgentStateError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível atualizar o estado do agente.',
      );
    } finally {
      setIsUpdatingAgentState(false);
    }
  };

  const handleUpdateAgentReplySettings = async (
    input: Parameters<typeof updateManagedAgentReplySettings>[0],
  ) => {
    try {
      setIsUpdatingAgentReplySettings(true);
      setAgentReplySettingsError(null);

      const response = await updateManagedAgentReplySettings(input, client);
      setSettings(response.settings);
    } catch (cause: unknown) {
      setAgentReplySettingsError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível atualizar as regras de resposta do agente.',
      );
    } finally {
      setIsUpdatingAgentReplySettings(false);
    }
  };

  if (isLoading) {
    return <SettingsPageSkeleton />;
  }

  if (loadError) {
    return (
      <div className="space-y-6 pb-8 sm:space-y-8 sm:pb-12" data-testid="settings-page">
        <section className="space-y-4 rounded-[1.75rem] border border-destructive/20 bg-card p-5 shadow-sm sm:rounded-[2rem] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-destructive">
            Configurações
          </p>
          <h1 className="text-[1.8rem] font-semibold tracking-tight text-foreground sm:text-[2.2rem]">
            Não foi possível carregar a área de configurações
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            {loadError}
          </p>
        </section>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className="space-y-6 pb-8 sm:space-y-8 sm:pb-12" data-testid="settings-page">
      <WhatsAppSettingsCard
        connectionActionError={connectionActionError}
        connectionPayload={connectionPayload}
        isDisconnecting={isDisconnecting}
        isConnecting={isFetchingConnectionPayload}
        isRefreshingStatus={isRefreshingStatus}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onRefreshStatus={handleRefreshStatus}
        settings={settings}
      />

      <AgentReplySettingsCard
        agentEnabled={settings.agentEnabled}
        agentStateError={agentStateError}
        error={agentReplySettingsError}
        isUpdatingAgentState={isUpdatingAgentState}
        isSaving={isUpdatingAgentReplySettings}
        onSave={handleUpdateAgentReplySettings}
        onToggleAgentState={handleToggleAgentState}
        settings={settings}
      />
    </div>
  );
}
