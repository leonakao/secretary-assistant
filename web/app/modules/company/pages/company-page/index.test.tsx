import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManagedCompany } from '../../api/company.api';
import type { BoundApiClient } from '~/lib/api-client-context';

const {
  mockClient,
  getManagedCompanyMock,
  updateProfileMock,
  updateKnowledgeBaseMock,
} = vi.hoisted(() => ({
  mockClient: {} as BoundApiClient,
  getManagedCompanyMock: vi.fn(),
  updateProfileMock: vi.fn(),
  updateKnowledgeBaseMock: vi.fn(),
}));

vi.mock('~/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: Record<string, unknown>) =>
    createElement('button', props, children as Parameters<typeof createElement>[2]),
}));

vi.mock('~/lib/api-client-context', () => ({
  useApiClient: () => mockClient,
}));

vi.mock('../../api/company.api', async () => {
  const actual = await vi.importActual<typeof import('../../api/company.api')>(
    '../../api/company.api',
  );

  return {
    ...actual,
    getManagedCompany: getManagedCompanyMock,
    updateManagedCompanyProfile: updateProfileMock,
    updateManagedCompanyKnowledgeBase: updateKnowledgeBaseMock,
  };
});

function makeCompany(overrides: Partial<ManagedCompany> = {}): ManagedCompany {
  return {
    id: 'company-1',
    name: 'Acme Dental',
    businessType: 'Clínica odontológica',
    description:
      '# Acme Dental\n\n## Sobre a Empresa\n- Atendimento humanizado\n- Horário comercial',
    step: 'running',
    updatedAt: '2026-03-28T12:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  getManagedCompanyMock.mockReset();
  updateProfileMock.mockReset();
  updateKnowledgeBaseMock.mockReset();
});

describe('CompanyPage', () => {
  it('loads company data and renders formatted knowledge instead of raw markdown', async () => {
    const { CompanyPage } = await import('./index');
    getManagedCompanyMock.mockResolvedValue({
      company: makeCompany(),
    });

    render(<CompanyPage />);

    expect(screen.getByTestId('company-page-skeleton')).toBeInTheDocument();

    await screen.findByRole('heading', { level: 1, name: 'Acme Dental' });
    expect(screen.queryByText('Resumo atual')).not.toBeInTheDocument();
    expect(screen.getByTestId('company-profile-name-value')).toHaveTextContent(
      'Acme Dental',
    );
    expect(
      screen.getByTestId('company-profile-business-type-value'),
    ).toHaveTextContent('Clínica odontológica');
    expect(screen.getByText('Sobre a Empresa')).toBeInTheDocument();
    expect(screen.getByText('Atendimento humanizado')).toBeInTheDocument();
    expect(
      screen.queryByDisplayValue('# Acme Dental\n\n## Sobre a Empresa\n- Atendimento humanizado\n- Horário comercial'),
    ).not.toBeInTheDocument();
  });

  it('saves the profile without entering knowledge edit mode', async () => {
    const { CompanyPage } = await import('./index');
    getManagedCompanyMock.mockResolvedValue({
      company: makeCompany(),
    });
    updateProfileMock.mockResolvedValue({
      company: makeCompany({ name: 'Acme Prime', businessType: 'Odontologia premium' }),
    });

    render(<CompanyPage />);

    await screen.findByRole('heading', { level: 1, name: 'Acme Dental' });

    fireEvent.click(screen.getByText('Editar perfil'));
    fireEvent.change(screen.getByTestId('company-profile-name-input'), {
      target: { value: 'Acme Prime' },
    });
    fireEvent.change(screen.getByTestId('company-profile-business-type-input'), {
      target: { value: 'Odontologia premium' },
    });
    fireEvent.click(screen.getByTestId('company-profile-save-button'));

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith(
        {
          name: 'Acme Prime',
          businessType: 'Odontologia premium',
        },
        mockClient,
      );
    });

    expect(screen.queryByTestId('company-knowledge-editor')).not.toBeInTheDocument();
    expect(screen.getByTestId('company-profile-success')).toBeInTheDocument();
    expect(screen.getByTestId('company-profile-name-value')).toHaveTextContent(
      'Acme Prime',
    );
  });

  it('shows raw markdown only in edit mode and cancels without persisting', async () => {
    const { CompanyPage } = await import('./index');
    getManagedCompanyMock.mockResolvedValue({
      company: makeCompany(),
    });

    render(<CompanyPage />);

    await screen.findByRole('heading', { level: 1, name: 'Acme Dental' });

    expect(screen.queryByTestId('company-knowledge-markdown-input')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('company-knowledge-edit-button'));

    const textarea = screen.getByTestId('company-knowledge-markdown-input');
    expect(textarea).toBeInTheDocument();
    fireEvent.change(textarea, {
      target: { value: '# Alterado' },
    });
    fireEvent.click(screen.getByTestId('company-knowledge-cancel-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('company-knowledge-markdown-input')).not.toBeInTheDocument();
    });
    expect(updateKnowledgeBaseMock).not.toHaveBeenCalled();
  });

  it('applies mobile-friendly full-width actions on the company page', async () => {
    const { CompanyPage } = await import('./index');
    getManagedCompanyMock.mockResolvedValue({
      company: makeCompany(),
    });

    render(<CompanyPage />);

    await screen.findByRole('heading', { level: 1, name: 'Acme Dental' });

    expect(screen.getByTestId('company-knowledge-edit-button')).toHaveClass(
      'w-full',
      'sm:w-auto',
    );
    expect(screen.getByText('Editar perfil')).toHaveClass('w-full', 'sm:w-auto');

    fireEvent.click(screen.getByText('Editar perfil'));

    expect(screen.getByTestId('company-profile-save-button')).toHaveClass(
      'w-full',
      'sm:w-auto',
    );
    expect(screen.getByTestId('company-profile-cancel-button')).toHaveClass(
      'w-full',
      'sm:w-auto',
    );
  });

  it('preserves the markdown draft when save fails', async () => {
    const { CompanyPage } = await import('./index');
    getManagedCompanyMock.mockResolvedValue({
      company: makeCompany(),
    });
    updateKnowledgeBaseMock.mockRejectedValue(new Error('Falha ao salvar.'));

    render(<CompanyPage />);

    await screen.findByRole('heading', { level: 1, name: 'Acme Dental' });

    fireEvent.click(screen.getByTestId('company-knowledge-edit-button'));
    const textarea = screen.getByTestId('company-knowledge-markdown-input');
    fireEvent.change(textarea, {
      target: { value: '# Base customizada' },
    });
    fireEvent.click(screen.getByTestId('company-knowledge-save-button'));

    await screen.findByTestId('company-knowledge-error');
    expect(screen.getByTestId('company-knowledge-markdown-input')).toHaveValue(
      '# Base customizada',
    );
  });
});
