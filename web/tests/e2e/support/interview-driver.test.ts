import {
  classifyPromptIntent,
  resolveAnswerForIntent,
  resolveTurnDelayMs,
} from './interview-driver';
import type { OnboardingBriefing } from './onboarding-briefing';

const briefing: OnboardingBriefing = {
  address: 'Rua Central, 10',
  bookingScheduling: 'Clients book by WhatsApp with at least 24 hours notice.',
  businessHours: 'Monday to Friday from 8:00 to 18:00.',
  businessType: 'Wellness clinic',
  cancellationPolicy: 'Clients can cancel with 24 hours notice.',
  clientNeeds: ['Pricing', 'Availability'],
  clientRequestFlow: 'Clients ask for a recommendation and then book.',
  commonQuestions: ['How many sessions are needed?'],
  companyDescription: 'Aurora is a small clinic focused on aesthetics.',
  companyName: 'Aurora',
  contactEmail: 'contato@aurora.test',
  contactPhone: '+55 11 4000-1234',
  differentiators: 'We create personalized treatment plans.',
  finishConfirmation: 'Yes, you can finalize the onboarding.',
  pricingApproach: 'We share a price range before the booking.',
  rawMarkdown: '',
  serviceArea: 'We serve clients in Sao Paulo.',
  services: ['Skin treatment', 'Laser hair removal'],
  turnaroundTime: 'Assessments last 45 minutes.',
};

describe('classifyPromptIntent', () => {
  it('classifies Portuguese onboarding prompts by intent', () => {
    expect(
      classifyPromptIntent('Você está pronto para começar?'),
    ).toEqual({
      intent: 'ready-to-start',
      matchedKeywords: ['pronto para comecar'],
    });

    expect(
      classifyPromptIntent(
        'Quais são os principais serviços oferecidos pela empresa?',
      ),
    ).toMatchObject({
      intent: 'services',
    });
    expect(
      classifyPromptIntent(
        'Quais são os principais serviços oferecidos pela empresa?',
      )?.matchedKeywords,
    ).toContain('servicos oferecidos');

    expect(
      classifyPromptIntent(
        'Ótimo! Para começarmos, por favor, me descreva os produtos ou serviços que a Luna Clean oferece.',
      ),
    ).toMatchObject({
      intent: 'services',
    });
    expect(
      classifyPromptIntent(
        'Ótimo! Para começarmos, por favor, me descreva os produtos ou serviços que a Luna Clean oferece.',
      )?.matchedKeywords,
    ).toEqual(
      expect.arrayContaining([
        'produtos ou servicos',
        'me descreva os produtos',
        'servicos que a',
      ]),
    );
  });

  it('returns null for unknown prompts', () => {
    expect(classifyPromptIntent('Qual é a sua cor favorita?')).toBeNull();
  });
});

describe('resolveAnswerForIntent', () => {
  it('builds coherent answers from the parsed briefing', () => {
    expect(resolveAnswerForIntent('pricing', briefing)).toBe(
      'We share a price range before the booking.',
    );
    expect(resolveAnswerForIntent('contact-phone', briefing)).toBe(
      'O telefone principal é +55 11 4000-1234.',
    );
    expect(resolveAnswerForIntent('services', briefing)).toContain(
      '- Skin treatment',
    );
  });
});

describe('resolveTurnDelayMs', () => {
  it('uses the default delay when the env value is missing or invalid', () => {
    expect(resolveTurnDelayMs(undefined)).toBe(15000);
    expect(resolveTurnDelayMs('not-a-number')).toBe(15000);
    expect(resolveTurnDelayMs('-1')).toBe(15000);
  });

  it('uses the configured delay when the env value is valid', () => {
    expect(resolveTurnDelayMs('22000')).toBe(22000);
  });
});
