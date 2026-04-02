import { buildOwnerPromptFromState } from './assistant-owner';

describe('buildOwnerPromptFromState', () => {
  it('renders the shared markdown structure with company context', () => {
    const prompt = buildOwnerPromptFromState({
      context: {
        companyId: 'company-1',
        instanceName: 'instance-1',
        companyDescription: '# Oficina Acme\n\nAtendimento com agendamento.',
        confirmations: [],
        userName: 'Carlos',
      },
      lastInteraction: new Date('2026-04-02T12:00:00.000Z'),
      messages: [],
      needsHumanSupport: false,
    } as never);

    expect(prompt).toContain('# Role');
    expect(prompt).toContain('# Business Context');
    expect(prompt).toContain('# Tool Usage');
    expect(prompt).toContain('# Oficina Acme');
    expect(prompt).not.toContain('<prompt>');
  });
});
