import { useEffect, useState } from 'react';
import { FilePenLine } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface CompanyKnowledgeEditorProps {
  initialMarkdown: string | null;
  onCancel: () => void;
  onSave: (markdown: string) => Promise<void>;
}

export function CompanyKnowledgeEditor({
  initialMarkdown,
  onCancel,
  onSave,
}: CompanyKnowledgeEditorProps) {
  const [markdown, setMarkdown] = useState(initialMarkdown ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setMarkdown(initialMarkdown ?? '');
  }, [initialMarkdown]);

  const handleCancel = () => {
    setMarkdown(initialMarkdown ?? '');
    setError(null);
    setSuccess(null);
    onCancel();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await onSave(markdown);
      setSuccess('Base de conhecimento atualizada.');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível salvar a base de conhecimento.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      className="rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-7"
      data-testid="company-knowledge-editor"
    >
      <div className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
            Base de conhecimento
          </p>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Modo de edição
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              O conteúdo em formato avançado aparece apenas aqui. Ao salvar, a
              página volta para a visualização formatada do mesmo documento.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-muted/35 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <FilePenLine className="h-3.5 w-3.5 text-brand" />
            Edição avançada
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            data-testid="company-knowledge-save-button"
            disabled={isSaving}
            onClick={() => void handleSave()}
          >
            {isSaving ? 'Salvando...' : 'Salvar base'}
          </Button>
          <Button
            data-testid="company-knowledge-cancel-button"
            disabled={isSaving}
            onClick={handleCancel}
            size="sm"
            variant="outline"
          >
            Cancelar
          </Button>
        </div>
      </div>

      <textarea
        className="mt-6 min-h-[28rem] w-full rounded-[1.75rem] border border-border bg-background px-4 py-4 font-mono text-sm leading-6 text-foreground outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
        data-testid="company-knowledge-markdown-input"
        disabled={isSaving}
        onChange={(event) => setMarkdown(event.target.value)}
        value={markdown}
      />

      {error ? (
        <p
          className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          data-testid="company-knowledge-error"
        >
          {error}
        </p>
      ) : null}

      {success ? (
        <p
          className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700"
          data-testid="company-knowledge-success"
        >
          {success}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-border/70 pt-6">
        <Button disabled={isSaving} onClick={() => void handleSave()}>
          {isSaving ? 'Salvando...' : 'Salvar base'}
        </Button>
        <Button
          disabled={isSaving}
          onClick={handleCancel}
          size="sm"
          variant="outline"
        >
          Cancelar
        </Button>
      </div>
    </section>
  );
}
