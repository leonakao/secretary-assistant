import { buildOnboardingPromptFromState } from './assistant-onboarding';

describe('buildOnboardingPromptFromState', () => {
  it('includes known company context and the no-reask instruction', () => {
    const prompt = buildOnboardingPromptFromState({
      context: {
        companyId: 'company-1',
        instanceName: 'instance-1',
        companyDescription: 'Contexto de onboarding',
        companyName: 'Acme',
        businessType: 'Clínica odontológica',
        confirmations: [],
        userName: 'Alice',
      },
      lastInteraction: new Date('2026-03-27T10:00:00.000Z'),
      messages: [],
      needsHumanSupport: false,
    } as never);

    expect(prompt).toContain('Nome da empresa: Acme');
    expect(prompt).toContain('NÃO pergunte novamente qual é o nome da empresa');
    expect(prompt).toContain('Tipo de negócio conhecido: Clínica odontológica');
  });
});
