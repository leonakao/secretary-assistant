import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { TestInfo } from '@playwright/test';
import type { OnboardingBriefing } from './onboarding-briefing';
import type { InterviewIntent, TranscriptMessage } from './interview-driver';

export type FailureBucket =
  | 'auth'
  | 'bootstrap'
  | 'completion-not-reached'
  | 'dashboard-access-regression'
  | 'dashboard-redirect'
  | 'interview-message-send'
  | 'interview-prompt-classification'
  | 'routing-to-onboarding';

export interface InterviewTurnArtifact {
  answer: string;
  assistantMessageId: string;
  intent: InterviewIntent;
  matchedKeywords: string[];
  prompt: string;
  turnIndex: number;
}

export interface OnboardingValidationArtifact {
  briefing: OnboardingBriefing;
  briefingFixturePath: string;
  completionReached: boolean;
  errorMessage: string | null;
  failureBucket: FailureBucket | null;
  finalRoute: string | null;
  finishedAt: string | null;
  runId: string;
  startedAt: string;
  transcript: TranscriptMessage[];
  turns: InterviewTurnArtifact[];
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function createRunId(testInfo: TestInfo): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${timestamp}-${slugify(testInfo.title)}`;
}

export function buildTranscriptMarkdown(
  transcript: TranscriptMessage[],
): string {
  if (transcript.length === 0) {
    return '# Transcript\n\nNo transcript messages were captured.\n';
  }

  const lines = ['# Transcript', ''];

  for (const message of transcript) {
    lines.push(`## ${message.role.toUpperCase()} · ${message.id}`);
    lines.push('');
    lines.push(message.content);
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

export function buildInterviewSummaryMarkdown(
  artifact: OnboardingValidationArtifact,
): string {
  const lines = [
    '# Onboarding Validation Summary',
    '',
    `- Run ID: ${artifact.runId}`,
    `- Started At: ${artifact.startedAt}`,
    `- Finished At: ${artifact.finishedAt ?? 'pending'}`,
    `- Final Route: ${artifact.finalRoute ?? 'unknown'}`,
    `- Completion Reached: ${artifact.completionReached ? 'yes' : 'no'}`,
    `- Failure Bucket: ${artifact.failureBucket ?? 'none'}`,
    `- Error: ${artifact.errorMessage ?? 'none'}`,
    '',
    '## Turn Decisions',
    '',
  ];

  if (artifact.turns.length === 0) {
    lines.push('No interview turns were recorded.');
  } else {
    for (const turn of artifact.turns) {
      lines.push(
        `${turn.turnIndex + 1}. [${turn.intent}] ${turn.prompt} -> ${turn.answer}`,
      );
    }
  }

  lines.push('');
  return `${lines.join('\n')}`;
}

export async function writeInterviewArtifacts(params: {
  artifact: OnboardingValidationArtifact;
  artifactDir: string;
}): Promise<string[]> {
  const { artifact, artifactDir } = params;

  await mkdir(artifactDir, { recursive: true });

  const files = [
    {
      name: 'briefing-source.md',
      content: artifact.briefing.rawMarkdown,
    },
    {
      name: 'briefing.json',
      content: JSON.stringify(artifact.briefing, null, 2),
    },
    {
      name: 'report.json',
      content: JSON.stringify(artifact, null, 2),
    },
    {
      name: 'summary.md',
      content: buildInterviewSummaryMarkdown(artifact),
    },
    {
      name: 'transcript.md',
      content: buildTranscriptMarkdown(artifact.transcript),
    },
  ] as const;

  await Promise.all(
    files.map(({ name, content }) => writeFile(join(artifactDir, name), content, 'utf8')),
  );

  return files.map(({ name }) => join(artifactDir, name));
}
