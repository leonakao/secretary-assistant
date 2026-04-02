import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { buildOnboardingPromptFromState } from './assistant-onboarding';

describe('buildOnboardingPromptFromState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-29T02:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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

    expect(prompt).toContain('Nome da empresa conhecido: Acme');
    expect(prompt).toContain('NÃO pergunte novamente qual é o nome da empresa');
    expect(prompt).toContain('Tipo de negócio conhecido: Clínica odontológica');
    expect(prompt).toContain('America/Sao_Paulo');
    expect(prompt).toContain('Data atual: 28/03/2026, 23:30:00');
    expect(prompt).toContain('# Role');
    expect(prompt).toContain('# Agent-Specific Rules');
    expect(prompt).toContain(
      'A única ferramenta disponível neste fluxo é "finishOnboarding"',
    );
    expect(prompt).toContain(
      'Depois da primeira resposta, não repita saudações de período no início das mensagens.',
    );
    expect(prompt).toContain(
      'Esta é a primeira mensagem visível da conversa, então uma saudação de abertura é permitida.',
    );
    expect(prompt).not.toContain('Você possui duas ferramentas específicas');
  });

  it('forbids repeated greeting when the assistant already responded in the thread', () => {
    const prompt = buildOnboardingPromptFromState({
      context: {
        companyId: 'company-1',
        instanceName: 'instance-1',
        companyDescription: 'Contexto de onboarding',
        companyName: 'Acme',
        confirmations: [],
        userName: 'Alice',
      },
      lastInteraction: new Date('2026-03-29T12:00:00.000Z'),
      messages: [{ type: 'ai', content: 'Olá!' }],
      needsHumanSupport: false,
    } as never);

    expect(prompt).toContain(
      'Esta conversa já foi iniciada, então responda sem nova saudação de abertura.',
    );
  });
});
