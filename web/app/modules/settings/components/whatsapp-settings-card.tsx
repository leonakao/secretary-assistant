import {
  AlertCircle,
  LoaderCircle,
  MessageCircleMore,
  QrCode,
  RefreshCcw,
  Unplug,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import type {
  ManagedWhatsAppConnectionPayload,
  ManagedWhatsAppSettings,
} from '../api/settings.api';
import { SettingsSectionShell } from './settings-section-shell';

interface WhatsAppSettingsCardProps {
  settings: ManagedWhatsAppSettings;
  connectionPayload?: ManagedWhatsAppConnectionPayload | null;
  connectionActionError?: string | null;
  isConnecting?: boolean;
  isRefreshingStatus?: boolean;
  isDisconnecting?: boolean;
  onConnect?: () => void | Promise<void>;
  onRefreshStatus?: () => void | Promise<void>;
  onDisconnect?: () => void | Promise<void>;
}

function getQrCodeImageSrc(qrCodeBase64: string) {
  if (qrCodeBase64.startsWith('data:image/')) {
    return qrCodeBase64;
  }

  return `data:image/png;base64,${qrCodeBase64}`;
}

function QrCodeCanvas({ qrCodeBase64 }: { qrCodeBase64: string }) {
  const imageSrc = getQrCodeImageSrc(qrCodeBase64);

  return (
    <img
      alt="QR code para conectar o WhatsApp"
      className="mx-auto aspect-square w-full max-w-[320px] rounded-xl bg-white object-contain"
      data-testid="whatsapp-settings-qr-code"
      src={imageSrc}
    />
  );
}

function getConnectionCopy(status: ManagedWhatsAppSettings['connectionStatus']) {
  switch (status) {
    case 'not-provisioned':
      return {
        label: 'WhatsApp ainda não configurado',
        description:
          'Prepare a conexão para exibir o QR code do WhatsApp.',
      };
    case 'disconnected':
      return {
        label: 'WhatsApp desconectado',
        description:
          'O WhatsApp ainda não está conectado. Inicie a conexão para vincular o número da empresa.',
      };
    case 'connecting':
      return {
        label: 'Aguardando conexão',
        description:
          'Escaneie o QR code para concluir a conexão do WhatsApp.',
      };
    case 'connected':
      return {
        label: 'WhatsApp conectado',
        description:
          'O agente já está conectado ao WhatsApp da empresa e pronto para operar.',
      };
    default:
      return {
        label: 'Status indisponível',
        description:
          'Não foi possível confirmar o estado atual da conexão com o WhatsApp.',
      };
  }
}

export function WhatsAppSettingsCard(props: WhatsAppSettingsCardProps) {
  const {
    settings,
    connectionPayload = null,
    connectionActionError = null,
    isConnecting = false,
    isRefreshingStatus = false,
    isDisconnecting = false,
    onConnect,
    onRefreshStatus,
    onDisconnect,
  } = props;

  const connection = getConnectionCopy(settings.connectionStatus);
  const isConnected = settings.connectionStatus === 'connected';
  const shouldShowConnect = settings.connectionStatus !== 'connected';
  const connectButtonLabel = 'Conectar WhatsApp';
  const shouldShowPayload =
    connectionPayload &&
    (connectionPayload.qrCodeBase64 || connectionPayload.expiresAt);

  return (
    <SettingsSectionShell
      eyebrow="Configurações"
      title="WhatsApp do agente"
      description="Conecte o WhatsApp da empresa e acompanhe o status da conexão."
    >
      <div
        className={`rounded-[1.5rem] border border-border bg-background/70 p-5 ${shouldShowPayload ? 'sm:flex sm:gap-6' : ''}`}
        data-testid="whatsapp-settings-status-card"
      >
        {/* Left column: status + buttons */}
        <div className={shouldShowPayload ? 'sm:flex-1' : ''}>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand/10 p-3 text-brand">
              <MessageCircleMore className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Conexão do WhatsApp
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">
                {connection.label}
              </h3>
            </div>
          </div>

          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            {connection.description}
          </p>

          <div className="mt-5 space-y-3">
            {connectionActionError ? (
              <div
                className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3"
                data-testid="whatsapp-settings-connection-error"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                <p className="text-sm leading-6 text-destructive">
                  {connectionActionError}
                </p>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {shouldShowConnect ? (
                <Button
                  className="w-full sm:w-auto"
                  data-testid="whatsapp-settings-connect-button"
                  disabled={isConnecting}
                  onClick={onConnect}
                  type="button"
                  variant="outline"
                >
                  {isConnecting ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4" />
                      {connectButtonLabel}
                    </>
                  )}
                </Button>
              ) : null}

              {settings.hasProvisionedInstance ? (
                <Button
                  className="w-full sm:w-auto"
                  data-testid="whatsapp-settings-refresh-button"
                  disabled={isRefreshingStatus}
                  onClick={onRefreshStatus}
                  type="button"
                  variant="outline"
                >
                  {isRefreshingStatus
                    ? <LoaderCircle className="h-4 w-4 animate-spin" />
                    : <RefreshCcw className="h-4 w-4" />
                  }
                  Atualizar status
                </Button>
              ) : null}

              {isConnected ? (
                <Button
                  className="w-full sm:w-auto"
                  data-testid="whatsapp-settings-disconnect-button"
                  disabled={isDisconnecting}
                  onClick={onDisconnect}
                  type="button"
                  variant="destructive"
                >
                  {isDisconnecting ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Desconectando...
                    </>
                  ) : (
                    <>
                      <Unplug className="h-4 w-4" />
                      Desconectar WhatsApp
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right column: QR code (large screen) / below (small screen) */}
        {shouldShowPayload ? (
          <div
            className="mt-5 border-t border-border pt-4 sm:mt-0 sm:w-56 sm:shrink-0 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0"
            data-testid="whatsapp-settings-connection-payload"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Escaneie o QR code para conectar
            </p>

            {connectionPayload.qrCodeBase64 ? (
              <div className="rounded-2xl bg-white p-3">
                <QrCodeCanvas
                  qrCodeBase64={connectionPayload.qrCodeBase64}
                />
              </div>
            ) : null}

            {connectionPayload.expiresAt ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Expira em{' '}
                <span
                  className="font-medium text-foreground"
                  data-testid="whatsapp-settings-payload-expiration"
                >
                  {connectionPayload.expiresAt}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </SettingsSectionShell>
  );
}
