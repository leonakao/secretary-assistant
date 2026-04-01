import { useEffect, useRef, useState } from 'react';
import { AlertCircle, LoaderCircle, Power, Save } from 'lucide-react';
import { Button } from '~/components/ui/button';
import type {
  ManagedAgentReplyListMode,
  ManagedAgentReplyScope,
  ManagedWhatsAppSettings,
  UpdateManagedAgentReplySettingsInput,
} from '../api/settings.api';
import { SettingsSectionShell } from './settings-section-shell';

interface AgentReplySettingsCardProps {
  settings: ManagedWhatsAppSettings;
  agentEnabled: boolean;
  agentStateError?: string | null;
  isUpdatingAgentState?: boolean;
  isSaving?: boolean;
  error?: string | null;
  onToggleAgentState?: () => void | Promise<void>;
  onSave?: (
    input: UpdateManagedAgentReplySettingsInput,
  ) => void | Promise<void>;
}

function normalizeListEntries(value: string): string[] {
  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function AgentReplySettingsCard(props: AgentReplySettingsCardProps) {
  const {
    settings,
    agentEnabled,
    agentStateError = null,
    isUpdatingAgentState = false,
    isSaving = false,
    error = null,
    onToggleAgentState,
    onSave,
  } = props;
  const {
    agentReplyListEntries,
    agentReplyListMode,
    agentReplyNamePattern,
    agentReplyScope,
  } = settings;

  const [scope, setScope] = useState<ManagedAgentReplyScope>(agentReplyScope);
  const [namePattern, setNamePattern] = useState(agentReplyNamePattern ?? '');
  const [listMode, setListMode] = useState<ManagedAgentReplyListMode>(
    agentReplyListMode ?? 'whitelist',
  );
  const [listEntriesText, setListEntriesText] = useState(
    agentReplyListEntries.join('\n'),
  );
  const scopeRef = useRef<ManagedAgentReplyScope>(agentReplyScope);
  const namePatternRef = useRef(agentReplyNamePattern ?? '');
  const listModeRef = useRef<ManagedAgentReplyListMode>(agentReplyListMode ?? 'whitelist');
  const listEntriesTextRef = useRef(agentReplyListEntries.join('\n'));

  useEffect(() => {
    setScope(agentReplyScope);
    setNamePattern(agentReplyNamePattern ?? '');
    setListMode(agentReplyListMode ?? 'whitelist');
    setListEntriesText(agentReplyListEntries.join('\n'));
    scopeRef.current = agentReplyScope;
    namePatternRef.current = agentReplyNamePattern ?? '';
    listModeRef.current = agentReplyListMode ?? 'whitelist';
    listEntriesTextRef.current = agentReplyListEntries.join('\n');
  }, [
    agentReplyListEntries,
    agentReplyListMode,
    agentReplyNamePattern,
    agentReplyScope,
  ]);

  const isSpecificScope = scope === 'specific';
  const normalizedEntries = normalizeListEntries(listEntriesText);
  const hasAnySpecificFilter =
    namePattern.trim().length > 0 || normalizedEntries.length > 0;

  const handleSave = () => {
    const currentScope = scopeRef.current;
    const currentNamePattern = namePatternRef.current.trim() || null;
    const currentListEntries = normalizeListEntries(listEntriesTextRef.current);

    void onSave?.({
      scope: currentScope,
      namePattern: currentNamePattern,
      listMode: currentListEntries.length > 0 ? listModeRef.current : null,
      listEntries: currentListEntries,
    });
  };

  return (
    <SettingsSectionShell
      eyebrow="Agente"
      title="Estado e respostas do agente"
      description="Controle se o agente está ativo e defina quem ele pode responder automaticamente."
    >
      <div className="space-y-5">
        {/* Agent toggle row */}
        <div className="flex items-center justify-between gap-3 rounded-[1.5rem] border border-border bg-background/70 p-5">
          <div className="flex items-center gap-3">
            <Button
              aria-label={agentEnabled ? 'Desligar agente' : 'Ligar agente'}
              className={`h-12 w-12 rounded-2xl p-0 transition-colors ${
                agentEnabled
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
                {agentEnabled ? 'Ligado' : 'Desligado'}
              </h3>
            </div>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
              agentEnabled
                ? 'bg-brand/10 text-brand'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {agentEnabled ? 'Ativo' : 'Pausado'}
          </div>
        </div>

        {/* Agent state error */}
        {agentStateError ? (
          <div
            className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3"
            data-testid="whatsapp-settings-agent-state-error"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
            <p className="text-sm leading-6 text-destructive">{agentStateError}</p>
          </div>
        ) : null}

        {/* Reply settings — only when agent is enabled */}
        {agentEnabled ? (
          <>
            {/* horizontal rule */}
            <div className="border-t border-border" />

                {/* Scope option cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-[1.5rem] border border-border bg-background/70 p-5 transition hover:border-brand/30 hover:bg-background has-[:checked]:border-brand/40 has-[:checked]:bg-brand/5">
                <input
                  checked={scope === 'all'}
                  className="mt-0.5 accent-brand"
                  data-testid="agent-reply-scope-all"
                  name="agent-reply-scope"
                  onChange={() => {
                    scopeRef.current = 'all';
                    setScope('all');
                  }}
                  type="radio"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">Todos</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    O agente responde qualquer contato reconhecido da empresa.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-[1.5rem] border border-border bg-background/70 p-5 transition hover:border-brand/30 hover:bg-background has-[:checked]:border-brand/40 has-[:checked]:bg-brand/5">
                <input
                  checked={scope === 'specific'}
                  className="mt-0.5 accent-brand"
                  data-testid="agent-reply-scope-specific"
                  name="agent-reply-scope"
                  onChange={() => {
                    scopeRef.current = 'specific';
                    setScope('specific');
                  }}
                  type="radio"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Apenas contatos específicos
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Use filtros para limitar quem recebe resposta automática.
                  </p>
                </div>
              </label>
            </div>

            {/* Error */}
            {error ? (
              <div
                className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3"
                data-testid="agent-reply-settings-error"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                <p className="text-sm leading-6 text-destructive">{error}</p>
              </div>
            ) : null}

            {/* Filter panel - only render when specific scope */}
            {isSpecificScope ? (
              <div className="rounded-[1.5rem] border border-border bg-background/70 p-5 space-y-5">
                {/* Name pattern */}
                <div className="space-y-2">
                  <label
                    className="text-sm font-semibold text-foreground"
                    htmlFor="agent-reply-name-pattern"
                  >
                    Padrão no nome{' '}
                    <span className="font-normal text-muted-foreground">
                      (opcional)
                    </span>
                  </label>
                  <input
                    className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand"
                    data-testid="agent-reply-name-pattern-input"
                    id="agent-reply-name-pattern"
                    onChange={(event) => {
                      namePatternRef.current = event.target.value;
                      setNamePattern(event.target.value);
                    }}
                    placeholder="Ex.: cliente, VIP"
                    type="text"
                    value={namePattern}
                  />
                  <p className="text-sm text-muted-foreground">
                    Filtra contatos pelo nome. Só responde quem contiver esse texto.
                  </p>
                </div>

                {/* List section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">
                      Lista de contatos{' '}
                      <span className="font-normal text-muted-foreground">
                        (opcional)
                      </span>
                    </p>
                    {/* Segmented toggle for whitelist/blacklist */}
                    <div className="inline-flex rounded-xl border border-border bg-muted p-1">
                      <label
                        className={`relative cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          listMode === 'whitelist'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <input
                          type="radio"
                          className="absolute inset-0 cursor-pointer opacity-0"
                          data-testid="agent-reply-list-mode-whitelist"
                          checked={listMode === 'whitelist'}
                          name="agent-reply-list-mode"
                          onChange={() => {
                            listModeRef.current = 'whitelist';
                            setListMode('whitelist');
                          }}
                        />
                        Whitelist
                      </label>
                      <label
                        className={`relative cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          listMode === 'blacklist'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <input
                          type="radio"
                          className="absolute inset-0 cursor-pointer opacity-0"
                          data-testid="agent-reply-list-mode-blacklist"
                          checked={listMode === 'blacklist'}
                          name="agent-reply-list-mode"
                          onChange={() => {
                            listModeRef.current = 'blacklist';
                            setListMode('blacklist');
                          }}
                        />
                        Blacklist
                      </label>
                    </div>
                  </div>

                  {/* Description based on list mode */}
                  {listMode === 'whitelist' ? (
                    <p className="text-sm text-muted-foreground">
                      Responde apenas contatos que combinem com uma entrada da lista (um telefone por linha).
                    </p>
                  ) : listMode === 'blacklist' ? (
                    <p className="text-sm text-muted-foreground">
                      Ignora contatos que combinem com uma entrada da lista (um telefone por linha).
                    </p>
                  ) : null}

                  <textarea
                    className="min-h-36 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand"
                    data-testid="agent-reply-list-entries-textarea"
                    id="agent-reply-list-entries"
                    onChange={(event) => {
                      listEntriesTextRef.current = event.target.value;
                      setListEntriesText(event.target.value);
                    }}
                    placeholder={"+5511999999999\n+5511888888888"}
                    value={listEntriesText}
                  />
                </div>

                {/* Empty hint */}
                {!hasAnySpecificFilter ? (
                  <div
                    className="rounded-2xl border border-amber-300/40 bg-amber-100/40 px-4 py-3 text-sm leading-6 text-amber-950"
                    data-testid="agent-reply-specific-empty-hint"
                  >
                    Sem filtros preenchidos, o agente ficará desativado para todos os contatos automáticos.
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Save button */}
            <div className="flex justify-end">
              <Button
                data-testid="agent-reply-save-button"
                disabled={isSaving}
                onClick={handleSave}
                type="button"
              >
                {isSaving ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar regras
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ligue o agente para configurar quem ele deve responder automaticamente.
          </p>
        )}
      </div>
    </SettingsSectionShell>
  );
}
