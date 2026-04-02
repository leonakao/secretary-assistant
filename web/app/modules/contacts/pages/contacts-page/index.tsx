import { MessageCircleMore, Users, UserRoundSearch } from 'lucide-react';

export function ContactsPage() {
  return (
    <div className="space-y-6" data-testid="contacts-page">
      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand/10 p-3 text-brand">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                Contatos
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                Espaço de contatos
              </h2>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-muted-foreground">
            Este módulo vai organizar clientes, leads e relacionamentos
            conectados às conversas do seu assistente.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <UserRoundSearch className="h-5 w-5 text-brand" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Preparado para diretório
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Este espaço está pronto para crescer com filtros, busca e
              detalhes de contato sem mudar a estrutura externa.
            </p>
          </div>
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <MessageCircleMore className="h-5 w-5 text-brand" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Contexto de conversa
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Futuros registros de contato poderão se conectar de forma limpa
              aos chats e ao histórico de atendimento.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
