import { AIMessage } from '@langchain/core/messages';
import {
  AgentPolicy,
  PolicyDecision,
  PolicyEvaluationParams,
} from './agent-policy.interface';

const EXPLICIT_CONFIRMATION_PATTERNS = [
  /\bsim\b.*\b(finalizar|encerrar|concluir)\b/,
  /\bpode\b.*\b(finalizar|encerrar|concluir)\b/,
  /\bautorizo\b.*\b(finalizar|encerrar|concluir)\b/,
  /\bquero\b.*\b(finalizar|encerrar|concluir)\b/,
  /\b(finaliza|finalize|finalizar|encerra|encerre|encerrar|conclui|conclua|concluir)\b/,
];

const AMBIGUOUS_CONFIRMATION_PATTERNS = [
  /\bacho que sim\b/,
  /\btalvez\b/,
  /\bmais ou menos\b/,
];

const CONTEXTUAL_AFFIRMATIVE_RESPONSES = [
  'sim',
  'sim sim',
  'pode',
  'pode sim',
  'pode ser',
  'ok',
  'okay',
  'beleza',
  'blz',
  'fechado',
  'combinado',
  'claro',
  'perfeito',
  'ta bom',
  'tudo bem',
  'isso',
  'isso mesmo',
  'correto',
  'manda ver',
  'vamos',
  'bora',
];

const FINALIZATION_REQUEST_PATTERNS = [
  /\bfinalizar\b/,
  /\bencerrar\b/,
  /\bconcluir\b/,
  /\bonboarding\b/,
];

function normalizeText(content: unknown): string {
  if (typeof content !== 'string') {
    return '';
  }

  return content
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[!?.,;:()"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasToolCall(message: AIMessage, toolName: string): boolean {
  return (
    message.tool_calls?.some((toolCall) => toolCall.name === toolName) ?? false
  );
}

function isExplicitConfirmation(
  humanMessage: string,
  previousAssistantMessage: string,
): boolean {
  if (
    AMBIGUOUS_CONFIRMATION_PATTERNS.some((pattern) =>
      pattern.test(humanMessage),
    )
  ) {
    return false;
  }

  if (
    EXPLICIT_CONFIRMATION_PATTERNS.some((pattern) => pattern.test(humanMessage))
  ) {
    return true;
  }

  if (!CONTEXTUAL_AFFIRMATIVE_RESPONSES.includes(humanMessage)) {
    return false;
  }

  return FINALIZATION_REQUEST_PATTERNS.some((pattern) =>
    pattern.test(previousAssistantMessage),
  );
}

export class RequireExplicitConfirmationPolicy implements AgentPolicy {
  readonly name = 'require-explicit-confirmation';

  constructor(private readonly toolName: string) {}

  async evaluate({
    lastAssistantMessage,
    state,
  }: PolicyEvaluationParams): Promise<PolicyDecision> {
    if (!hasToolCall(lastAssistantMessage, this.toolName)) {
      return { allow: true };
    }

    const priorMessages = state.messages.slice(0, -1);
    const latestHumanMessage = [...priorMessages]
      .reverse()
      .find((message) => message.type === 'human');
    const previousAssistantMessage = latestHumanMessage
      ? [...priorMessages]
          .slice(0, priorMessages.indexOf(latestHumanMessage))
          .reverse()
          .find((message) => message.type === 'ai')
      : undefined;

    const humanText = normalizeText(latestHumanMessage?.content);
    const assistantText = normalizeText(previousAssistantMessage?.content);

    if (humanText && isExplicitConfirmation(humanText, assistantText)) {
      return { allow: true };
    }

    return {
      allow: false,
      reason:
        'O onboarding ainda não pode ser finalizado porque não houve uma confirmação explícita e contextual do usuário.',
      remediation:
        'Peça confirmação clara para finalizar o onboarding antes de tentar usar finishOnboarding novamente.',
    };
  }
}
