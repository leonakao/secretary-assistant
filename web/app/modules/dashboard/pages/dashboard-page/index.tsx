import { Activity, Building2, MessageSquareText, ShieldCheck } from 'lucide-react';
import { useAuthenticatedAppShell } from '~/modules/app-shell/use-authenticated-app-shell';

export function DashboardPage() {
  const { sessionUser } = useAuthenticatedAppShell();

  return (
    <div className="space-y-6" data-testid="app-home-page">
      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
            Visão geral
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Bem-vindo de volta, {sessionUser.name}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            Esta é a home da área autenticada. A partir daqui você pode evoluir
            empresa, contatos e configurações sem refazer o shell a cada passo.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-muted p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand/10 p-2 text-brand">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Sessão protegida</p>
                  <p className="text-xs text-muted-foreground">Confirmada via /users/me</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{sessionUser.email}</p>
            </div>
            <div className="rounded-3xl bg-muted p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand/10 p-2 text-brand">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Status da empresa</p>
                  <p className="text-xs text-muted-foreground">Empresa da área atual</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {sessionUser.company?.name || 'Nenhuma empresa vinculada ainda'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
            Próximos passos
          </p>
          <div className="mt-6 space-y-4">
            {[
              {
                icon: MessageSquareText,
                title: 'Modele seu assistente',
                copy: 'Use as novas seções da área para evoluir a configuração sem poluir o painel.',
              },
              {
                icon: Activity,
                title: 'Escale a estrutura com clareza',
                copy: 'Cada contexto agora tem rota própria e espaço para crescer de forma independente.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-3xl bg-muted p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-brand/10 p-2 text-brand">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {item.copy}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
