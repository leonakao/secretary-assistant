import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OnboardingMessageBubble } from './onboarding-message-bubble';

describe('OnboardingMessageBubble', () => {
  it('renders double-asterisk markdown as bold text', () => {
    render(
      <OnboardingMessageBubble
        message={{
          id: 'assistant-1',
          role: 'assistant',
          content: 'Confira **horários de atendimento** antes de continuar.',
          createdAt: '2026-05-04T12:00:00.000Z',
        }}
      />,
    );

    const content = screen.getByTestId('onboarding-message-content');
    const boldText = screen.getByText('horários de atendimento');

    expect(content).toHaveTextContent(
      'Confira horários de atendimento antes de continuar.',
    );
    expect(boldText.tagName).toBe('STRONG');
  });

  it('keeps unmatched double asterisks visible', () => {
    render(
      <OnboardingMessageBubble
        message={{
          id: 'assistant-1',
          role: 'assistant',
          content: 'Texto com **marcação incompleta',
          createdAt: '2026-05-04T12:00:00.000Z',
        }}
      />,
    );

    expect(screen.getByTestId('onboarding-message-content')).toHaveTextContent(
      'Texto com **marcação incompleta',
    );
  });
});
