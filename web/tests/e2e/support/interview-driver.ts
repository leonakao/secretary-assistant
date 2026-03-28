import type { Locator, Page } from '@playwright/test';
import type { OnboardingBriefing } from './onboarding-briefing';
import type {
  FailureBucket,
  InterviewTurnArtifact,
} from './interview-report';

const DEFAULT_ASSISTANT_REPLY_TIMEOUT_MS = 180000;
const DEFAULT_TURN_DELAY_MS = 15000;

export type InterviewIntent =
  | 'address'
  | 'booking'
  | 'business-hours'
  | 'cancellation'
  | 'client-needs'
  | 'commitment-confirmation'
  | 'common-questions'
  | 'company-overview'
  | 'contact-email'
  | 'contact-phone'
  | 'differentiators'
  | 'finish-confirmation'
  | 'pricing'
  | 'ready-to-start'
  | 'service-area'
  | 'services'
  | 'turnaround-time';

export interface PromptClassification {
  intent: InterviewIntent;
  matchedKeywords: string[];
}

export interface TranscriptMessage {
  content: string;
  id: string;
  role: 'assistant' | 'user';
}

export class InterviewDriverError extends Error {
  constructor(
    public readonly bucket: FailureBucket,
    message: string,
  ) {
    super(message);
    this.name = 'InterviewDriverError';
  }
}

const PROMPT_RULES: Array<{
  intent: InterviewIntent;
  keywords: string[];
}> = [
  {
    intent: 'ready-to-start',
    keywords: [
      'pronto para comecar',
      'pronta para comecar',
      'ready to start',
      'podemos comecar',
    ],
  },
  {
    intent: 'commitment-confirmation',
    keywords: [
      'posso contar com voce',
      'contar com voce',
      'compromete',
      'responder com detalhes',
    ],
  },
  {
    intent: 'services',
    keywords: [
      'produtos servicos',
      'produtos ou servicos',
      'me descreva os produtos',
      'descreva os produtos',
      'descreva os servicos',
      'descreva os produtos ou servicos',
      'quais produtos ou servicos',
      'quais sao os produtos',
      'servicos oferecidos',
      'servicos que a',
      'o que voce oferece',
      'o que a empresa oferece',
      'quais sao os principais servicos',
      'what services',
    ],
  },
  {
    intent: 'business-hours',
    keywords: ['horario de atendimento', 'dias da semana', 'business hours'],
  },
  {
    intent: 'contact-phone',
    keywords: ['telefone de contato', 'telefone principal', 'phone number', 'whatsapp'],
  },
  {
    intent: 'address',
    keywords: ['endereco fisico', 'atendimento presencial', 'address', 'localizacao'],
  },
  {
    intent: 'contact-email',
    keywords: ['e mail', 'email de contato', 'contact email'],
  },
  {
    intent: 'pricing',
    keywords: [
      'politica de precos',
      'formas de pagamento',
      'price range',
      'pricing',
      'payment',
    ],
  },
  {
    intent: 'turnaround-time',
    keywords: [
      'tempo medio de entrega',
      'tempo medio de atendimento',
      'lead time',
      'quanto tempo',
    ],
  },
  {
    intent: 'service-area',
    keywords: [
      'area de cobertura',
      'area de atendimento',
      'regioes',
      'bairros',
      'service area',
    ],
  },
  {
    intent: 'booking',
    keywords: ['agendamento', 'booking', 'appointment', 'schedule'],
  },
  {
    intent: 'cancellation',
    keywords: ['cancelamento', 'reagendamento', 'cancellation', 'rescheduling'],
  },
  {
    intent: 'common-questions',
    keywords: ['perguntas frequentes', 'duvidas frequentes', 'faq', 'common questions'],
  },
  {
    intent: 'differentiators',
    keywords: ['diferenciais', 'concorrentes', 'diferente da concorrencia', 'why choose'],
  },
  {
    intent: 'client-needs',
    keywords: [
      'tipos de solicitacoes',
      'clientes fazem',
      'o que os clientes procuram',
      'look for in chat',
    ],
  },
  {
    intent: 'finish-confirmation',
    keywords: [
      'finalizar o onboarding',
      'ativar o sistema',
      'posso finalizar',
      'can i finish',
    ],
  },
  {
    intent: 'company-overview',
    keywords: [
      'sobre sua empresa',
      'sobre o seu negocio',
      'describe your company',
      'fale sobre sua empresa',
    ],
  },
];

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function listAnswer(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

function rowLocator(page: Page): Locator {
  return page.getByTestId('onboarding-message-row');
}

function assistantRowLocator(page: Page): Locator {
  return page.locator(
    '[data-testid="onboarding-message-row"][data-message-role="assistant"]',
  );
}

export function resolveTurnDelayMs(
  envValue: string | undefined = process.env.ONBOARDING_VALIDATION_TURN_DELAY_MS,
): number {
  if (!envValue) {
    return DEFAULT_TURN_DELAY_MS;
  }

  const parsed = Number.parseInt(envValue, 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_TURN_DELAY_MS;
  }

  return parsed;
}

export function classifyPromptIntent(prompt: string): PromptClassification | null {
  const normalizedPrompt = normalizeText(prompt);

  for (const rule of PROMPT_RULES) {
    const matchedKeywords = rule.keywords.filter((keyword) =>
      normalizedPrompt.includes(normalizeText(keyword)),
    );

    if (matchedKeywords.length > 0) {
      return {
        intent: rule.intent,
        matchedKeywords,
      };
    }
  }

  return null;
}

export function resolveAnswerForIntent(
  intent: InterviewIntent,
  briefing: OnboardingBriefing,
): string {
  switch (intent) {
    case 'ready-to-start':
      return 'Sim, estou pronto para começar.';
    case 'commitment-confirmation':
      return 'Sim, pode contar comigo. Vou responder cada pergunta com o máximo de detalhe possível.';
    case 'company-overview':
      return `${briefing.companyName} é uma ${briefing.businessType.toLowerCase()}.

${briefing.companyDescription}`;
    case 'services':
      return `Os principais serviços da empresa são:\n${listAnswer(briefing.services)}`;
    case 'business-hours':
      return briefing.businessHours;
    case 'contact-phone':
      return `O telefone principal é ${briefing.contactPhone}.`;
    case 'address':
      return `Nosso endereço é ${briefing.address}.`;
    case 'contact-email':
      return `O e-mail principal é ${briefing.contactEmail}.`;
    case 'pricing':
      return briefing.pricingApproach;
    case 'turnaround-time':
      return briefing.turnaroundTime;
    case 'service-area':
      return briefing.serviceArea;
    case 'booking':
      return briefing.bookingScheduling;
    case 'cancellation':
      return briefing.cancellationPolicy;
    case 'common-questions':
      return `As perguntas mais frequentes são:\n${listAnswer(briefing.commonQuestions)}`;
    case 'differentiators':
      return briefing.differentiators;
    case 'client-needs':
      return `No chat, os clientes normalmente procuram:\n${listAnswer(briefing.clientNeeds)}

Fluxo mais comum:
${briefing.clientRequestFlow}`;
    case 'finish-confirmation':
      return briefing.finishConfirmation;
  }
}

export async function readTranscript(page: Page): Promise<TranscriptMessage[]> {
  const rows = rowLocator(page);
  const count = await rows.count();
  const transcript: TranscriptMessage[] = [];

  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const role = await row.getAttribute('data-message-role');
    const id = await row.getAttribute('data-message-id');

    if ((role !== 'assistant' && role !== 'user') || !id) {
      continue;
    }

    transcript.push({
      content: (await row.getByTestId('onboarding-message-content').innerText()).trim(),
      id,
      role,
    });
  }

  return transcript;
}

export async function readLatestAssistantMessage(
  page: Page,
): Promise<TranscriptMessage> {
  const rows = assistantRowLocator(page);
  const count = await rows.count();

  if (count === 0) {
    throw new InterviewDriverError(
      'completion-not-reached',
      'No assistant prompt was visible in the onboarding transcript.',
    );
  }

  const row = rows.nth(count - 1);
  const id = await row.getAttribute('data-message-id');

  if (!id) {
    throw new InterviewDriverError(
      'interview-prompt-classification',
      'Assistant transcript row is missing data-message-id.',
    );
  }

  return {
    content: (await row.getByTestId('onboarding-message-content').innerText()).trim(),
    id,
    role: 'assistant',
  };
}

async function waitForAssistantReply(params: {
  page: Page;
  previousAssistantId: string;
  timeoutMs: number;
}): Promise<'dashboard' | 'reply'> {
  const { page, previousAssistantId, timeoutMs } = params;

  try {
    await page.waitForFunction(
      ({ previousId }) => {
        if (window.location.pathname === '/dashboard') {
          return true;
        }

        const assistantRows = Array.from(
          document.querySelectorAll<HTMLElement>(
            '[data-testid="onboarding-message-row"][data-message-role="assistant"]',
          ),
        );
        const latestAssistantRow = assistantRows.at(-1);

        return (
          Boolean(latestAssistantRow) &&
          latestAssistantRow?.getAttribute('data-message-id') !== previousId
        );
      },
      { previousId: previousAssistantId },
      { timeout: timeoutMs },
    );
  } catch {
    throw new InterviewDriverError(
      'interview-message-send',
      `No follow-up assistant prompt arrived within ${timeoutMs}ms after replying to assistant message ${previousAssistantId}.`,
    );
  }

  return page.url().includes('/dashboard') ? 'dashboard' : 'reply';
}

export async function driveInterview(params: {
  briefing: OnboardingBriefing;
  maxTurns: number;
  page: Page;
  timeoutPerTurnMs?: number;
  turnDelayMs?: number;
}): Promise<InterviewTurnArtifact[]> {
  const {
    briefing,
    maxTurns,
    page,
    timeoutPerTurnMs = DEFAULT_ASSISTANT_REPLY_TIMEOUT_MS,
    turnDelayMs = resolveTurnDelayMs(),
  } = params;
  const turns: InterviewTurnArtifact[] = [];
  const answeredAssistantIds = new Set<string>();

  for (let turnIndex = 0; turnIndex < maxTurns; turnIndex += 1) {
    if (page.url().includes('/dashboard')) {
      return turns;
    }

    const assistantPrompt = await readLatestAssistantMessage(page);

    if (answeredAssistantIds.has(assistantPrompt.id)) {
      throw new InterviewDriverError(
        'completion-not-reached',
        `Interview stalled on assistant prompt ${assistantPrompt.id} without reaching the dashboard.`,
      );
    }

    const classification = classifyPromptIntent(assistantPrompt.content);

    if (!classification) {
      throw new InterviewDriverError(
        'interview-prompt-classification',
        `Could not classify onboarding assistant prompt: "${assistantPrompt.content}"`,
      );
    }

    const answer = resolveAnswerForIntent(classification.intent, briefing);

    turns.push({
      answer,
      assistantMessageId: assistantPrompt.id,
      intent: classification.intent,
      matchedKeywords: classification.matchedKeywords,
      prompt: assistantPrompt.content,
      turnIndex,
    });

    answeredAssistantIds.add(assistantPrompt.id);

    if (turnDelayMs > 0) {
      await page.waitForTimeout(turnDelayMs);
    }

    await page.getByTestId('onboarding-chat-input').fill(answer);
    await page.getByTestId('onboarding-chat-send-button').click();

    const outcome = await waitForAssistantReply({
      page,
      previousAssistantId: assistantPrompt.id,
      timeoutMs: timeoutPerTurnMs,
    });

    if (outcome === 'dashboard') {
      return turns;
    }
  }

  throw new InterviewDriverError(
    'completion-not-reached',
    `Interview exceeded the maximum turn limit of ${maxTurns} without reaching the dashboard.`,
  );
}
