import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildInterviewSummaryMarkdown,
  buildTranscriptMarkdown,
  writeInterviewArtifacts,
  type OnboardingValidationArtifact,
} from './interview-report';

const artifact: OnboardingValidationArtifact = {
  briefingMarkdown: '# Briefing',
  briefingFixturePath: 'fixtures/onboarding-company-briefing.md',
  completionReached: true,
  errorMessage: null,
  failureBucket: null,
  finalRoute: '/app',
  finishedAt: '2026-03-27T12:10:00.000Z',
  runId: 'run-123',
  startedAt: '2026-03-27T12:00:00.000Z',
  transcript: [
    { content: 'Você está pronto para começar?', id: 'assistant-1', role: 'assistant' },
    { content: 'Sim, estou pronto para começar.', id: 'user-1', role: 'user' },
  ],
  turns: [
    {
      answer: 'Sim, estou pronto para começar.',
      answerModel: 'gpt-5-nano',
      assistantMessageId: 'assistant-1',
      prompt: 'Você está pronto para começar?',
      turnIndex: 0,
    },
  ],
};

describe('interview report helpers', () => {
  it('renders markdown summaries and transcripts', () => {
    expect(buildTranscriptMarkdown(artifact.transcript)).toContain(
      '## ASSISTANT · assistant-1',
    );
    expect(buildInterviewSummaryMarkdown(artifact)).toContain('[gpt-5-nano]');
  });

  it('writes all report artifacts to disk', async () => {
    const artifactDir = await mkdtemp(join(tmpdir(), 'onboarding-report-'));

    try {
      const files = await writeInterviewArtifacts({ artifact, artifactDir });

      expect(files).toHaveLength(4);
      await expect(readFile(join(artifactDir, 'report.json'), 'utf8')).resolves.toContain(
        '"runId": "run-123"',
      );
    } finally {
      await rm(artifactDir, { force: true, recursive: true });
    }
  });
});
