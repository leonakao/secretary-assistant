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
  briefing: {
    address: 'Rua Central, 10',
    bookingScheduling: 'Clients book by WhatsApp.',
    businessHours: 'Monday to Friday.',
    businessType: 'Wellness clinic',
    cancellationPolicy: 'Cancel with 24 hours notice.',
    clientNeeds: ['Pricing'],
    clientRequestFlow: 'Clients ask for recommendations.',
    commonQuestions: ['How many sessions do I need?'],
    companyDescription: 'Aurora is a clinic.',
    companyName: 'Aurora',
    contactEmail: 'contato@aurora.test',
    contactPhone: '+55 11 4000-1234',
    differentiators: 'Personalized plans.',
    finishConfirmation: 'Yes, you can finalize the onboarding.',
    pricingApproach: 'We share a price range.',
    rawMarkdown: '# Briefing',
    serviceArea: 'Sao Paulo',
    services: ['Skin treatment'],
    turnaroundTime: '45 minutes',
  },
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
      assistantMessageId: 'assistant-1',
      intent: 'ready-to-start',
      matchedKeywords: ['pronto para comecar'],
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
    expect(buildInterviewSummaryMarkdown(artifact)).toContain('[ready-to-start]');
  });

  it('writes all report artifacts to disk', async () => {
    const artifactDir = await mkdtemp(join(tmpdir(), 'onboarding-report-'));

    try {
      const files = await writeInterviewArtifacts({ artifact, artifactDir });

      expect(files).toHaveLength(5);
      await expect(readFile(join(artifactDir, 'report.json'), 'utf8')).resolves.toContain(
        '"runId": "run-123"',
      );
    } finally {
      await rm(artifactDir, { force: true, recursive: true });
    }
  });
});
