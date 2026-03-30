import {
  AlertCircle,
  LoaderCircle,
  MessageCircleMore,
  Power,
  QrCode,
  RefreshCcw,
  Smartphone,
  Unplug,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
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
  agentStateError?: string | null;
  isConnecting?: boolean;
  isRefreshingStatus?: boolean;
  isDisconnecting?: boolean;
  isUpdatingAgentState?: boolean;
  onConnect?: () => void | Promise<void>;
  onRefreshStatus?: () => void | Promise<void>;
  onDisconnect?: () => void | Promise<void>;
  onToggleAgentState?: () => void | Promise<void>;
}

function getQrCodeImageSrc(qrCodeBase64: string) {
  if (qrCodeBase64.startsWith('data:image/')) {
    return qrCodeBase64;
  }

  return `data:image/png;base64,${qrCodeBase64}`;
}

function QrCodeCanvas({ qrCodeBase64 }: { qrCodeBase64: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasRenderError, setHasRenderError] = useState(false);
  const imageSrc = getQrCodeImageSrc(qrCodeBase64);
  const imageId = useId();

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    let context: CanvasRenderingContext2D | null = null;

    try {
      context = canvas.getContext('2d');
    } catch {
      setHasRenderError(true);
      return;
    }

    if (!context) {
      setHasRenderError(true);
      return;
    }

    const image = new Image();
    image.decoding = 'async';

    image.onload = () => {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      setHasRenderError(false);
    };

    image.onerror = () => {
      setHasRenderError(true);
    };

    image.src = imageSrc;
  }, [imageSrc]);

  if (hasRenderError) {
    return (
      <img
        alt="QR code para conectar o WhatsApp"
        className="mx-auto aspect-square w-full max-w-[320px] rounded-xl bg-white object-contain"
        data-testid="whatsapp-settings-qr-code"
        src={imageSrc}
      />
    );
  }

  return (
    <>
      <canvas
        aria-labelledby={imageId}
        className="mx-auto aspect-square w-full max-w-[320px] rounded-xl bg-white object-contain"
        data-testid="whatsapp-settings-qr-code"
        ref={canvasRef}
      />
      <span className="sr-only" id={imageId}>
        QR code para conectar o WhatsApp
      </span>
    </>
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
    agentStateError = null,
    isConnecting = false,
    isRefreshingStatus = false,
    isDisconnecting = false,
    isUpdatingAgentState = false,
    onConnect,
    onRefreshStatus,
    onDisconnect,
    onToggleAgentState,
  } = props;

  const connection = getConnectionCopy(settings.connectionStatus);
  const isConnected = settings.connectionStatus === 'connected';
  const shouldShowConnect = settings.connectionStatus !== 'connected';
  const connectButtonLabel = 'Conectar WhatsApp';
  const hasExpiration = Boolean(connectionPayload?.expiresAt);
  const shouldShowPayload =
    connectionPayload &&
    (connectionPayload.qrCodeBase64 || connectionPayload.expiresAt);

  return (
    <SettingsSectionShell
      eyebrow="Configurações"
      title="WhatsApp do agente"
      description="Conecte o WhatsApp da empresa, acompanhe o status da conexão e controle quando o agente deve responder automaticamente."
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <div
          className="rounded-[1.5rem] border border-border bg-background/70 p-5"
          data-testid="whatsapp-settings-status-card"
        >
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

            {shouldShowPayload ? (
              <div
                className="rounded-[1.5rem] border border-border/80 bg-card p-4"
                data-testid="whatsapp-settings-connection-payload"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-brand/10 p-3 text-brand">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Conexão manual
                    </p>
                    <h4 className="mt-1 text-base font-semibold text-foreground">
                      Use o QR code para conectar
                    </h4>
                  </div>
                </div>

                <div
                  className={`mt-4 grid gap-4 ${
                    hasExpiration
                      ? 'md:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]'
                      : ''
                  }`}
                >
                  {connectionPayload.qrCodeBase64 ? (
                    <div className="rounded-2xl border border-border bg-white p-4">
                      <QrCodeCanvas
                        qrCodeBase64={connectionPayload.qrCodeBase64}
                      />
                    </div>
                  ) : null}

                  {connectionPayload.expiresAt ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-border bg-background px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Expira em
                        </p>
                        <p
                          className="mt-2 text-sm font-medium text-foreground"
                          data-testid="whatsapp-settings-payload-expiration"
                        >
                          {connectionPayload.expiresAt}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div
          className="rounded-[1.5rem] border border-border bg-background/70 p-5"
          data-testid="whatsapp-settings-agent-state-card"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                aria-label={settings.agentEnabled ? 'Desligar agente' : 'Ligar agente'}
                className={`h-12 w-12 rounded-2xl p-0 transition-colors ${
                  settings.agentEnabled
                    ? 'bg-brand text-brand-foreground hover:bg-brand/90'
                    : 'bg-brand/10 text-brand hover:bg-brand/30'
                }`}
                data-testid="whatsapp-settings-agent-toggle-button"
                disabled={isUpdatingAgentState}
                onClick={onToggleAgentState}
                type="button"
                variant="ghost"
              >
                {isUpdatingAgentState ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : (
                  <Power className="h-5 w-5" />
                )}
              </Button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Estado do agente
                </p>
                <h3
                  className="mt-1 text-lg font-semibold text-foreground"
                  data-testid="whatsapp-settings-agent-enabled-label"
                >
                  {settings.agentEnabled ? 'Ligado' : 'Desligado'}
                </h3>
              </div>
            </div>

            <div
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                settings.agentEnabled
                  ? 'bg-brand/10 text-brand'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {settings.agentEnabled ? 'Ativo' : 'Pausado'}
            </div>
          </div>

          {agentStateError ? (
            <div
              className="mt-4 flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3"
              data-testid="whatsapp-settings-agent-state-error"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
              <p className="text-sm leading-6 text-destructive">
                {agentStateError}
              </p>
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-border/80 bg-card px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Comportamento atual
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {settings.agentEnabled
                ? 'O agente responde automaticamente aos clientes.'
                : 'O agente está pausado, mas o WhatsApp pode seguir conectado.'}
            </p>
          </div>
        </div>
      </div>
    </SettingsSectionShell>
  );
}
