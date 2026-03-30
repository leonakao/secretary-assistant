import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
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
    reload: vi.fn(),
  });
});

describe('OnboardingPage', () => {
  it('keeps the sidebar sticky and moves desktop scrolling to the content column', async () => {
    resolveOnboardingStepMock.mockReturnValue('assistant-chat');

    const { OnboardingPage } = await import('./index');

    const { container } = render(<OnboardingPage />);
    const page = screen.getByTestId('onboarding-page');
    const sidebar = container.querySelector('aside');
    const contentColumn = sidebar?.nextElementSibling;

    expect(page).toHaveClass('lg:h-screen', 'lg:overflow-hidden');
    expect(sidebar).not.toBeNull();
    expect(sidebar).toHaveClass('lg:sticky', 'lg:top-0', 'lg:h-screen');
    expect(contentColumn).not.toBeNull();
    expect(contentColumn).toHaveClass(
      'lg:h-screen',
      'lg:min-h-0',
      'lg:overflow-y-auto',
    );
  });
});
