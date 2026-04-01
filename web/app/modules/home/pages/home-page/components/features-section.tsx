import { Bot, Clock, MessageSquare, Settings, Shield, Zap } from 'lucide-react';

export function FeaturesSection() {
  return (
    <section id="features" className="bg-background px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mb-16 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand">
            Recursos
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Tudo o que o seu negócio
            <br />
            precisa para escalar o atendimento.
          </h2>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            Da primeira mensagem do cliente até um atendimento confirmado,
            sua secretária com IA cuida de tudo sem exigir ação manual.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Large featured card — spans 2 cols */}
          <div className="group relative overflow-hidden rounded-3xl bg-foreground p-8 text-background sm:col-span-2">
            <div className="relative z-10 flex h-full flex-col justify-between gap-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand">
                <Bot className="h-6 w-6 text-brand-foreground" />
              </div>
              <div>
                <h3 className="mb-3 text-xl font-bold text-background">
                  Conversas com IA
                </h3>
                <p className="max-w-md text-sm leading-6 text-background/60">
                  Seu agente entende contexto, tom e intenção. Ele responde de
                  forma natural às dúvidas dos clientes e sabe quando criar uma
                  solicitação, pedir mais detalhes ou transferir para você.
                </p>
              </div>
              {/* Inline stat row */}
              <div className="flex flex-wrap gap-6">
                {[
                  { label: 'Tempo médio de resposta', value: '< 2s' },
                  { label: 'Idiomas suportados', value: 'Qualquer um' },
                  { label: 'Transferência para humano', value: 'Instantânea' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-2xl font-bold text-brand">{value}</p>
                    <p className="text-xs text-background/50">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Background glow */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/12 blur-3xl" />
          </div>

          {/* WhatsApp native */}
          <div className="rounded-3xl border border-border bg-card p-7">
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle">
              <MessageSquare className="h-5 w-5 text-brand" />
            </div>
            <h3 className="mb-2 font-semibold text-card-foreground">
              Nativo no WhatsApp
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Conecta direto ao seu número via Evolution API. Seus clientes
              continuam falando com você do mesmo jeito de sempre.
            </p>
          </div>

          {/* 24/7 availability */}
          <div className="rounded-3xl border border-border bg-canvas p-7">
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle">
              <Clock className="h-5 w-5 text-brand" />
            </div>
            <h3 className="mb-2 font-semibold text-foreground">
              Disponível 24/7
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Sua secretária não dorme. Clientes recebem respostas imediatas a
              qualquer hora, inclusive fins de semana e feriados.
            </p>
          </div>

          {/* Service requests — accent card */}
          <div className="rounded-3xl bg-brand p-7">
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-foreground/15">
              <Zap className="h-5 w-5 text-brand-foreground" />
            </div>
            <h3 className="mb-2 font-semibold text-brand-foreground">
              Gestão de solicitações
            </h3>
            <p className="text-sm leading-6 text-brand-foreground/70">
              O agente cria e acompanha solicitações automaticamente, mantendo
              você e seus clientes informados em cada etapa.
            </p>
          </div>

          {/* Easy configuration */}
          <div className="rounded-3xl border border-border bg-card p-7">
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle">
              <Settings className="h-5 w-5 text-brand" />
            </div>
            <h3 className="mb-2 font-semibold text-card-foreground">
              Configuração simples
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Defina nome da empresa, serviços e personalidade do agente em um
              painel limpo. Fica pronto em minutos.
            </p>
          </div>

          {/* Owner escalation — wide card */}
          <div className="rounded-3xl border border-border bg-card p-7 sm:col-span-2 lg:col-span-1">
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle">
              <Shield className="h-5 w-5 text-brand" />
            </div>
            <h3 className="mb-2 font-semibold text-card-foreground">
              Escalonamento inteligente
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Quando a situação realmente precisa da sua atenção, o agente
              direciona a conversa para você, e só então.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
