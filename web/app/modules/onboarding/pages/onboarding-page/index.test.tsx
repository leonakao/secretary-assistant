import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode, createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  navigateMock,
  usePageLoaderMock,
  resolveOnboardingStepMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  usePageLoaderMock: vi.fn(),
  resolveOnboardingStepMock: vi.fn(),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('~/lib/api-client-context', () => ({
  usePageLoader: usePageLoaderMock,
}));

vi.mock('../../use-cases/load-onboarding-page-data', () => ({
  loadOnboardingPageData: vi.fn(),
}));

vi.mock('../../use-cases/resolve-onboarding-step', () => ({
  resolveOnboardingStep: resolveOnboardingStepMock,
}));

vi.mock('./components/company-bootstrap-form', () => ({
  CompanyBootstrapForm: ({ onSuccess }: { onSuccess: () => void }) =>
    createElement('button', { onClick: onSuccess }, 'Company bootstrap form'),
}));

vi.mock('./components/onboarding-chat', () => ({
  OnboardingChat: ({ onComplete }: { onComplete: () => void }) =>
    createElement('button', { onClick: onComplete }, 'Onboarding chat'),
}));

beforeEach(() => {
  navigateMock.mockReset();
  usePageLoaderMock.mockReset();
  resolveOnboardingStepMock.mockReset();
  usePageLoaderMock.mockReturnValue({
    data: {
      company: {
        id: 'company-1',
        name: 'Acme Dental',
      },
    },
    error: null,
    isLoading: false,
    loader: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn(),
  });
});

describe('OnboardingPage', () => {
  it('keeps the sidebar sticky and constrains desktop scrolling to the chat transcript', async () => {
    resolveOnboardingStepMock.mockReturnValue('assistant-chat');

    const { OnboardingPage } = await import('./index');

    const { container } = render(<OnboardingPage />);
    const page = screen.getByTestId('onboarding-page');
    const sidebar = container.querySelector('aside');
    const contentColumn = sidebar?.nextElementSibling;
    const assistantStep = screen.getByTestId('onboarding-step-assistant-chat');
    const chatWrapper = assistantStep.nextElementSibling;

    expect(page).toHaveClass('lg:h-screen', 'lg:overflow-hidden');
    expect(sidebar).not.toBeNull();
    expect(sidebar).toHaveClass('lg:sticky', 'lg:top-0', 'lg:h-screen');
    expect(contentColumn).not.toBeNull();
    expect(contentColumn).toHaveClass(
      'lg:h-screen',
      'lg:min-h-0',
      'lg:overflow-hidden',
    );
    expect(assistantStep).toHaveClass('shrink-0');
    expect(chatWrapper).not.toBeNull();
    expect(chatWrapper).toHaveClass('flex', 'flex-1', 'min-h-0', 'overflow-hidden');
  });

  it('deduplicates the onboarding state bootstrap under StrictMode', async () => {
    const loader = vi.fn().mockResolvedValue(undefined);

    usePageLoaderMock.mockReturnValue({
      data: {
        company: {
          id: 'company-1',
          name: 'Acme Dental',
        },
        onboarding: {
          requiresOnboarding: true,
          step: 'assistant-chat',
        },
      },
      error: null,
      isLoading: false,
      loader,
      reload: vi.fn(),
    });
    resolveOnboardingStepMock.mockReturnValue('assistant-chat');

    const { OnboardingPage } = await import('./index');

    render(
      <StrictMode>
        <OnboardingPage />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(loader).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps the user on onboarding when the persisted step is complete', async () => {
    resolveOnboardingStepMock.mockReturnValue('complete');

    const { OnboardingPage } = await import('./index');

    render(<OnboardingPage />);

    expect(
      screen.getByText('Seu assistente inicial já está configurado'),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
