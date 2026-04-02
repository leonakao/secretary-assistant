import { buildClientPromptFromState } from './assistant-client';

describe('buildClientPromptFromState', () => {
  it('includes the company description in the prompt context', () => {
    const prompt = buildClientPromptFromState({
      context: {
        companyId: 'company-1',
        instanceName: 'instance-1',
        companyDescription: '# Acme\n\nAtendemos de segunda a sexta.',
        confirmations: [],
        contactId: 'contact-1',
        contactName: 'Maria',
      },
      lastInteraction: new Date('2026-04-02T12:00:00.000Z'),
      messages: [],
      needsHumanSupport: false,
    });

    expect(prompt).toContain('<contexto>');
    expect(prompt).toContain('# Acme');
    expect(prompt).toContain('Atendemos de segunda a sexta.');
  });

  it('omits the context block when company description is empty', () => {
    const prompt = buildClientPromptFromState({
      context: {
        companyId: 'company-1',
        instanceName: 'instance-1',
        companyDescription: '   ',
        confirmations: [],
        contactId: 'contact-1',
        contactName: 'Maria',
      },
      lastInteraction: new Date('2026-04-02T12:00:00.000Z'),
      messages: [],
      needsHumanSupport: false,
    });

    expect(prompt).not.toContain('<contexto>');
  });
});
