const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_INTERVIEW_HELPER_MODEL = 'gpt-5-nano';

const SYSTEM_PROMPT = `Voce e um agente auxiliar de testes para um fluxo de onboarding.

Sua tarefa e responder, em portugues do Brasil, a pergunta atual do entrevistador.

Regras obrigatorias:
- Use apenas as informacoes presentes no briefing fornecido.
- Responda apenas a pergunta atual. Ignore agradecimentos, confirmacoes e texto de transicao.
- Seja objetivo, consistente e pronto para ser enviado no chat.
- Se a pergunta pedir lista, responda em lista.
- Se o briefing nao tiver a informacao exata, diga claramente que você ainda não tem esse ponto definido e peça pular essa pergunta.
- Se o entrevistor tentar forçar uma definição de algo que não está no briefing, insista que isso deve ser tratado em outro momento.
- Nao invente politicas, precos, horarios ou detalhes operacionais ausentes.
- Nao explique sua logica.
- Retorne somente o texto final da resposta.`;

export interface GenerateInterviewAnswerParams {
  briefingMarkdown: string;
  question: string;
}

export interface GenerateInterviewAnswerResult {
  answer: string;
  model: string;
}

function resolveFallbackAnswer(question: string): string | null {
  const normalizedQuestion = question.trim().toLowerCase();

  if (
    normalizedQuestion.includes('você está pronto para começar') ||
    normalizedQuestion.includes('voce esta pronto para comecar')
  ) {
    return 'Sim, estou pronto para começar.';
  }

  if (
    normalizedQuestion.includes('posso contar com você') ||
    normalizedQuestion.includes('posso contar com voce')
  ) {
    return 'Sim, posso detalhar as próximas perguntas com base no briefing.';
  }

  if (
    (normalizedQuestion.includes('posso finalizar o onboarding') &&
      normalizedQuestion.includes('ativar o sistema')) ||
    normalizedQuestion.includes('responda "sim" para finalizar') ||
    normalizedQuestion.includes("responda 'sim' para finalizar") ||
    normalizedQuestion.includes('responda sim para finalizar')
  ) {
    return 'Sim';
  }

  return null;
}

function extractOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const outputText =
    'output_text' in payload && typeof payload.output_text === 'string'
      ? payload.output_text.trim()
      : '';

  if (outputText) {
    return outputText;
  }

  if (!('output' in payload) || !Array.isArray(payload.output)) {
    return null;
  }

  for (const outputItem of payload.output) {
    if (!outputItem || typeof outputItem !== 'object') {
      continue;
    }

    if (!('content' in outputItem) || !Array.isArray(outputItem.content)) {
      continue;
    }

    const fragments = outputItem.content
      .map((contentItem: unknown) => {
        if (!contentItem || typeof contentItem !== 'object') {
          return null;
        }

        return 'text' in contentItem && typeof contentItem.text === 'string'
          ? contentItem.text.trim()
          : null;
      })
      .filter((value: string | null): value is string => Boolean(value));

    if (fragments.length > 0) {
      return fragments.join('\n\n').trim();
    }
  }

  return null;
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || !('error' in payload)) {
    return null;
  }

  const error = payload.error;

  if (!error || typeof error !== 'object') {
    return null;
  }

  return 'message' in error && typeof error.message === 'string'
    ? error.message
    : null;
}

export async function generateInterviewAnswer({
  briefingMarkdown,
  question,
}: GenerateInterviewAnswerParams): Promise<GenerateInterviewAnswerResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required to generate interview answers.');
  }

  const fallbackAnswer = resolveFallbackAnswer(question);

  if (fallbackAnswer) {
    return {
      answer: fallbackAnswer,
      model: `${DEFAULT_INTERVIEW_HELPER_MODEL}:fallback`,
    };
  }

  const model =
    process.env.OPENAI_INTERVIEW_HELPER_MODEL ?? DEFAULT_INTERVIEW_HELPER_MODEL;
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      store: false,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: SYSTEM_PROMPT }],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Briefing da empresa:
${briefingMarkdown}

Pergunta atual do entrevistador:
${question}`,
            },
          ],
        },
      ],
    }),
  });
  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    const errorMessage =
      extractErrorMessage(payload) ??
      `OpenAI interview helper request failed with status ${response.status}.`;

    throw new Error(errorMessage);
  }

  const answer = extractOutputText(payload);

  if (!answer) {
    const fallbackAnswer = resolveFallbackAnswer(question);

    if (fallbackAnswer) {
      return {
        answer: fallbackAnswer,
        model: `${model}:fallback`,
      };
    }

    throw new Error('OpenAI interview helper returned an empty answer.');
  }

  return {
    answer,
    model,
  };
}

export const __private__ = {
  extractErrorMessage,
  extractOutputText,
  resolveFallbackAnswer,
};
