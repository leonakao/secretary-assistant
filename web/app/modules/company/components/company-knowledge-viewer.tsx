import type { ReactNode } from 'react';
import { BookOpenText, FilePenLine, Sparkles } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface CompanyKnowledgeViewerProps {
  markdown: string | null;
  onEdit: () => void;
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>;
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded bg-muted px-1.5 py-0.5 text-[0.9em]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}

function renderMarkdown(markdown: string): ReactNode[] {
  const lines = markdown.split('\n');
  const nodes: ReactNode[] = [];
  let listItems: string[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    nodes.push(
      <p
        key={`p-${nodes.length}`}
        className="text-[0.98rem] leading-8 text-foreground/88"
      >
        {renderInlineMarkdown(paragraphLines.join(' '))}
      </p>,
    );
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }

    nodes.push(
      <ul
        key={`ul-${nodes.length}`}
        className="list-disc space-y-2.5 pl-6 text-[0.98rem] leading-8 text-foreground/88 marker:text-brand/70"
      >
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{renderInlineMarkdown(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushParagraph();
      listItems.push(line.slice(2).trim());
      continue;
    }

    flushList();

    if (line.startsWith('# ')) {
      flushParagraph();
      nodes.push(
        <h3
          key={`h1-${nodes.length}`}
          className="text-3xl font-semibold tracking-tight text-foreground"
        >
          {renderInlineMarkdown(line.slice(2))}
        </h3>,
      );
      continue;
    }

    if (line.startsWith('## ')) {
      flushParagraph();
      nodes.push(
        <h4
          key={`h2-${nodes.length}`}
          className="pt-4 text-xl font-semibold tracking-tight text-foreground"
        >
          {renderInlineMarkdown(line.slice(3))}
        </h4>,
      );
      continue;
    }

    if (line.startsWith('### ')) {
      flushParagraph();
      nodes.push(
        <h5
          key={`h3-${nodes.length}`}
          className="pt-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand"
        >
          {renderInlineMarkdown(line.slice(4))}
        </h5>,
      );
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return nodes;
}

export function CompanyKnowledgeViewer({
  markdown,
  onEdit,
}: CompanyKnowledgeViewerProps) {
  const hasContent = Boolean(markdown?.trim());

  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:rounded-[2rem] sm:p-7">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
            Base de conhecimento
          </p>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Documento usado pelo assistente
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Revise o conhecimento consolidado a partir do onboarding antes de
              entrar no modo de edição do conteúdo.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-muted/35 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            Versão de leitura formatada a partir da base da empresa
          </div>
        </div>
        <Button
          className="w-full sm:w-auto"
          data-testid="company-knowledge-edit-button"
          onClick={onEdit}
          size="sm"
          variant="outline"
        >
          <FilePenLine className="h-4 w-4" />
          Editar conteúdo
        </Button>
      </div>

      {hasContent ? (
        <div
          className="mt-6 overflow-hidden rounded-[1.9rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,246,241,0.98)_100%)] shadow-[0_1px_0_rgba(255,255,255,0.6)_inset]"
          data-testid="company-knowledge-viewer"
        >
          <div className="border-b border-border/60 px-4 py-4 sm:px-8">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <BookOpenText className="h-4 w-4 text-brand" />
              Visualização
            </div>
          </div>
          <div className="px-4 py-6 sm:px-8 sm:py-8">
            <div className="space-y-5">{renderMarkdown(markdown!.trim())}</div>
          </div>
        </div>
      ) : (
        <div
          className="mt-6 rounded-[1.9rem] border border-dashed border-border bg-background/80 p-4 sm:p-6"
          data-testid="company-knowledge-empty-state"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="w-fit rounded-2xl bg-brand/10 p-3 text-brand">
              <BookOpenText className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <p className="text-base font-semibold text-foreground">
                Sua base de conhecimento ainda está vazia
              </p>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                Quando houver conteúdo salvo, esta área passa a funcionar como
                um documento de referência do assistente. Você pode começar
                preenchendo ou revisando esse conteúdo manualmente.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
