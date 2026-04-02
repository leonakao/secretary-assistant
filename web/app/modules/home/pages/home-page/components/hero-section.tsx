import { Bot, Check, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

const chatMessages = [
  { from: 'client', text: 'Olá! Preciso agendar um reparo no meu ar-condicionado.', time: '09:41' },
  {
    from: 'agent',
    text: 'Olá! Sou a Secretary Assistant da CoolFix Services. Posso te ajudar a agendar o reparo. Você pode me enviar seu endereço e o melhor horário?',
    time: '09:41',
  },
  { from: 'client', text: 'Claro! Rua Oak, 340, amanhã à tarde.', time: '09:43' },
  {
    from: 'agent',
    text: 'Perfeito. Criei uma solicitação para amanhã às 14h. Você receberá a confirmação em instantes. Posso ajudar em mais alguma coisa?',
    time: '09:43',
  },
  { from: 'client', text: 'Foi rápido! Obrigado 👍', time: '09:44' },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-surface-hero">
      {/* Nav */}
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand">
            <Bot className="h-4.5 w-4.5 text-brand-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-surface-hero-foreground">
            Secretary Assistant
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/login?mode=signin"
            className="text-sm font-medium text-surface-hero-muted transition-colors hover:text-surface-hero-foreground"
          >
            Entrar
          </Link>
          <Link
            to="/login?mode=signup"
            className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-mid"
          >
            Começar
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero body */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-6 pb-24 pt-16 lg:grid-cols-[1fr_480px] lg:pt-20">
        {/* Left: copy */}
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1.5 text-xs font-semibold text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Agente de IA para WhatsApp · pronto em minutos
          </div>

          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-surface-hero-foreground sm:text-5xl lg:text-6xl">
            Seu negócio,
            <br />
            <span className="text-brand-mid">respondendo 24/7</span>
            <br />
            no WhatsApp.
          </h1>

          <p className="max-w-lg text-lg leading-7 text-surface-hero-muted">
            Coloque no ar uma secretária com IA que atende seus clientes no
            WhatsApp, cria solicitações de serviço, responde dúvidas e só
            escalona quando você realmente precisa entrar.
          </p>

          <ul className="space-y-2.5 text-sm text-surface-hero-muted">
            {[
              'Configure em menos de 5 minutos',
              'Acompanhamento de solicitações já incluso',
              'Escalona para você quando importa',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-brand-mid" />
                {item}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login?mode=signup"
              className="flex items-center justify-center gap-2 rounded-xl bg-brand px-7 py-3.5 text-sm font-semibold text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:bg-brand-hover hover:shadow-brand/30"
            >
              Comece grátis
            </Link>
            <a
              href="#features"
              className="flex items-center justify-center gap-2 rounded-xl border border-surface-hero-muted/25 px-7 py-3.5 text-sm font-semibold text-surface-hero-muted transition-colors hover:border-surface-hero-muted/50 hover:text-surface-hero-foreground"
            >
              Veja como funciona
            </a>
          </div>
        </div>

        {/* Right: WhatsApp chat mockup */}
        <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
          <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-surface-hero-card shadow-2xl shadow-black/40">
            {/* WhatsApp-style header */}
            <div className="flex items-center gap-3 border-b border-white/8 bg-surface-hero-mid px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand">
                <Bot className="h-5 w-5 text-brand-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-surface-hero-foreground">
                  CoolFix Services
                </p>
                <p className="text-xs text-surface-hero-chat-agent-muted">
                  Secretária com IA · online
                </p>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-1 w-1 rounded-full bg-surface-hero-muted" />
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-3 bg-[oklch(0.155_0.014_260)] px-4 py-4">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.from === 'client' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs leading-5 ${
                      msg.from === 'client'
                        ? 'rounded-tl-sm bg-surface-hero-card text-surface-hero-foreground'
                        : 'rounded-tr-sm border border-white/6 bg-surface-hero-chat-agent text-surface-hero-chat-agent-foreground'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <p
                      className={`mt-1 text-right text-[10px] ${
                        msg.from === 'client'
                          ? 'text-surface-hero-muted'
                          : 'text-surface-hero-chat-agent-muted'
                      }`}
                    >
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              <div className="flex justify-end">
                <div className="flex items-center gap-1 rounded-2xl rounded-tr-sm border border-white/6 bg-surface-hero-chat-agent/70 px-3.5 py-2.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-surface-hero-chat-agent-muted"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Floating stat badge */}
          <div className="absolute -bottom-4 -right-4 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-surface-hero-mid px-4 py-3 shadow-xl shadow-black/30 backdrop-blur-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20">
              <Check className="h-4 w-4 text-brand-mid" />
            </div>
            <div>
              <p className="text-xs font-semibold text-surface-hero-foreground">
                Solicitação criada
              </p>
              <p className="text-[10px] text-surface-hero-muted">
                Reparo no ar-condicionado · Amanhã às 14h
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ambient glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-[600px] w-[600px] rounded-full bg-brand/6 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-brand/4 blur-[100px]" />
      </div>
    </section>
  );
}
