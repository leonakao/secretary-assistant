import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import {
  buildBootstrapCompanyInput,
  parseOnboardingBriefing,
} from './support/onboarding-briefing';
import {
  driveInterview,
  InterviewDriverError,
  readTranscript,
  type TranscriptMessage,
} from './support/interview-driver';
import {
  createRunId,
  writeInterviewArtifacts,
  type FailureBucket,
  type OnboardingValidationArtifact,
} from './support/interview-report';

const BRIEFING_FIXTURE_PATH = join(
  process.cwd(),
  'tests/e2e/fixtures/onboarding-company-briefing.md',
);
const INITIAL_ASSISTANT_PROMPT_TIMEOUT_MS = 180000;

test('fresh owner completes onboarding and reaches the dashboard with interview evidence', async ({
  page,
}, testInfo) => {
  const briefingMarkdown = await readFile(BRIEFING_FIXTURE_PATH, 'utf8');
  const briefing = parseOnboardingBriefing(briefingMarkdown);
  const bootstrapInput = buildBootstrapCompanyInput(briefing);
  const runId = createRunId(testInfo);
  const artifactDir = join(process.cwd(), 'test-results/onboarding-validation', runId);
  const artifact: OnboardingValidationArtifact = {
    briefing,
    briefingFixturePath: BRIEFING_FIXTURE_PATH,
    completionReached: false,
    errorMessage: null,
    failureBucket: null,
    finalRoute: null,
    finishedAt: null,
    runId,
    startedAt: new Date().toISOString(),
    transcript: [],
    turns: [],
  };

  try {
    await test.step('authenticate through the fresh signup path', async () => {
      await page.goto('/login?mode=signup');
      await expect(page.getByTestId('login-page')).toBeVisible();
      await page.getByTestId('login-signup-button').click();
      await page.waitForURL('**/onboarding');
      artifact.finalRoute = '/onboarding';
    });

    await test.step('complete company bootstrap with briefing-backed values', async () => {
      await expect(page.getByTestId('onboarding-step-company-bootstrap')).toBeVisible();
      await page
        .getByTestId('company-bootstrap-name-input')
        .fill(bootstrapInput.name);
      await page
        .getByTestId('company-bootstrap-business-type-input')
        .fill(bootstrapInput.businessType);
      await page.getByTestId('company-bootstrap-submit-button').click();
      await expect(page.getByTestId('onboarding-step-assistant-chat')).toBeVisible();
    });

    await test.step('drive the onboarding interview from the real UI transcript', async () => {
      await expect
        .poll(
          async () =>
            page
              .locator(
                '[data-testid="onboarding-message-row"][data-message-role="assistant"]',
              )
              .count(),
          { timeout: INITIAL_ASSISTANT_PROMPT_TIMEOUT_MS },
        )
        .toBeGreaterThan(0);

      artifact.turns = await driveInterview({
        briefing,
        maxTurns: 20,
        page,
      });
      artifact.completionReached = true;

      await page.waitForURL('**/dashboard');
      artifact.finalRoute = '/dashboard';
    });

    await test.step('keep dashboard access unlocked after completion', async () => {
      await expect(page.getByTestId('dashboard-page')).toBeVisible();
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByTestId('dashboard-page')).toBeVisible();
    });
  } catch (cause) {
    artifact.failureBucket =
      cause instanceof InterviewDriverError
        ? cause.bucket
        : resolveFailureBucket(cause);
    artifact.errorMessage =
      cause instanceof Error ? cause.message : 'Unknown onboarding validation failure.';

    throw cause;
  } finally {
    artifact.finishedAt = new Date().toISOString();
    artifact.finalRoute = page.url() ? new URL(page.url()).pathname : artifact.finalRoute;
    artifact.transcript = await readTranscript(page).catch(() => []);
    if (artifact.transcript.length === 0) {
      artifact.transcript = buildTranscriptFromTurns(artifact.turns);
    }
    await writeInterviewArtifacts({ artifact, artifactDir });
    await testInfo.attach('onboarding-validation-report', {
      contentType: 'application/json',
      path: join(artifactDir, 'report.json'),
    });
  }
});

function resolveFailureBucket(cause: unknown): FailureBucket {
  const message = cause instanceof Error ? cause.message.toLowerCase() : '';

  if (
    message.includes('unknown onboarding prompt intent') ||
    message.includes('no assistant prompt found') ||
    message.includes('interview')
  ) {
    return 'interview-prompt-classification';
  }

  if (
    message.includes('failed to send message') ||
    message.includes('failed to send audio') ||
    message.includes('send message')
  ) {
    return 'interview-message-send';
  }

  if (
    message.includes('company-bootstrap') ||
    message.includes('company bootstrap')
  ) {
    return 'bootstrap';
  }

  if (
    message.includes('waitforurl') ||
    message.includes('/dashboard') ||
    message.includes('dashboard')
  ) {
    return 'dashboard-redirect';
  }

  if (
    message.includes('/onboarding') ||
    message.includes('redirected to onboarding') ||
    message.includes('routing-to-onboarding')
  ) {
    return 'routing-to-onboarding';
  }

  if (
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('completion')
  ) {
    return 'completion-not-reached';
  }

  return 'auth';
}

function buildTranscriptFromTurns(
  turns: OnboardingValidationArtifact['turns'],
): TranscriptMessage[] {
  return turns.flatMap((turn) => [
    {
      content: turn.prompt,
      id: turn.assistantMessageId,
      role: 'assistant' as const,
    },
    {
      content: turn.answer,
      id: `answer-${turn.turnIndex}`,
      role: 'user' as const,
    },
  ]);
}
