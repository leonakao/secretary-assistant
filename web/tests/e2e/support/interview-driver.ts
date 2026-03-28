import type { Locator, Page } from '@playwright/test';
import { generateInterviewAnswer } from './interview-answer-agent';
import type {
  FailureBucket,
  InterviewTurnArtifact,
} from './interview-report';

const DEFAULT_ASSISTANT_REPLY_TIMEOUT_MS = 180000;
const DEFAULT_TURN_DELAY_MS = 0;

export interface TranscriptMessage {
  content: string;
  id: string;
  role: 'assistant' | 'user';
}

export class InterviewDriverError extends Error {
  constructor(
    public readonly bucket: FailureBucket,
    message: string,
    public readonly turns: InterviewTurnArtifact[] = [],
  ) {
    super(message);
    this.name = 'InterviewDriverError';
  }
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
}): Promise<'workspace' | 'reply'> {
  const { page, previousAssistantId, timeoutMs } = params;

  try {
    await page.waitForFunction(
      ({ previousId }) => {
        if (window.location.pathname === '/app') {
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

  return page.url().includes('/app') ? 'workspace' : 'reply';
}

export async function driveInterview(params: {
  briefingMarkdown: string;
  maxTurns: number;
  page: Page;
  timeoutPerTurnMs?: number;
  turnDelayMs?: number;
}): Promise<InterviewTurnArtifact[]> {
  const {
    briefingMarkdown,
    maxTurns,
    page,
    timeoutPerTurnMs = DEFAULT_ASSISTANT_REPLY_TIMEOUT_MS,
    turnDelayMs = resolveTurnDelayMs(),
  } = params;
  const turns: InterviewTurnArtifact[] = [];
  const answeredAssistantIds = new Set<string>();

  for (let turnIndex = 0; turnIndex < maxTurns; turnIndex += 1) {
    if (page.url().includes('/app')) {
      return turns;
    }

    const assistantPrompt = await readLatestAssistantMessage(page);

    if (answeredAssistantIds.has(assistantPrompt.id)) {
      throw new InterviewDriverError(
        'completion-not-reached',
        `Interview stalled on assistant prompt ${assistantPrompt.id} without reaching the app workspace.`,
        turns,
      );
    }

    let generatedAnswer;

    try {
      generatedAnswer = await generateInterviewAnswer({
        briefingMarkdown,
        question: assistantPrompt.content,
      });
    } catch (cause) {
      throw new InterviewDriverError(
        'interview-answer-generation',
        cause instanceof Error
          ? cause.message
          : `Failed to generate an interview answer for prompt ${assistantPrompt.id}.`,
        turns,
      );
    }

    turns.push({
      answer: generatedAnswer.answer,
      answerModel: generatedAnswer.model,
      assistantMessageId: assistantPrompt.id,
      prompt: assistantPrompt.content,
      turnIndex,
    });

    answeredAssistantIds.add(assistantPrompt.id);

    if (turnDelayMs > 0) {
      await page.waitForTimeout(turnDelayMs);
    }

    if (page.url().includes('/app')) {
      return turns;
    }

    await page.getByTestId('onboarding-chat-input').fill(generatedAnswer.answer);
    await page.getByTestId('onboarding-chat-send-button').click();

    const outcome = await waitForAssistantReply({
      page,
      previousAssistantId: assistantPrompt.id,
      timeoutMs: timeoutPerTurnMs,
    });

    if (outcome === 'workspace') {
      return turns;
    }
  }

  throw new InterviewDriverError(
    'completion-not-reached',
    `Interview exceeded the maximum turn limit of ${maxTurns} without reaching the app workspace.`,
    turns,
  );
}
