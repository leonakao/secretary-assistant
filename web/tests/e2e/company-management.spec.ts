import { expect, test } from '@playwright/test';

const COMPLETED_SESSION_USER = {
  authProviderId: 'auth0|company-owner',
  company: {
    id: 'company-owner-1',
    name: 'Acme Dental',
    role: 'owner' as const,
    step: 'running' as const,
  },
  createdAt: '2026-03-28T00:00:00.000Z',
  email: 'owner@secretary-assistant.test',
  id: 'user-company-owner',
  name: 'Company Owner',
  onboarding: {
    requiresOnboarding: false,
    step: 'complete' as const,
  },
  phone: null,
  updatedAt: '2026-03-28T00:00:00.000Z',
};

test('owner can manage company profile and knowledge base from the company page', async ({
  page,
}) => {
  const company: {
    id: string;
    name: string;
    businessType: string | null;
    description: string;
    step: 'running';
    updatedAt: string;
  } = {
    id: 'company-owner-1',
    name: 'Acme Dental',
    businessType: 'Clínica odontológica',
    description:
      '# Acme Dental\n\n## Atendimento\n- Limpeza\n- Clareamento\n\nEquipe com foco em atendimento humanizado.',
    step: 'running' as const,
    updatedAt: '2026-03-28T12:00:00.000Z',
  };

  await page.route('**/users/me', async (route) => {
    await route.fulfill({
      body: JSON.stringify(COMPLETED_SESSION_USER),
      contentType: 'application/json',
      status: 200,
    });
  });

  await page.route('**/companies/me', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      body: JSON.stringify({ company }),
      contentType: 'application/json',
      status: 200,
    });
  });

  await page.route('**/companies/me/profile', async (route) => {
    const payload = route.request().postDataJSON() as {
      name: string;
      businessType: string | null;
    };

    company.name = payload.name;
    company.businessType = payload.businessType;
    company.updatedAt = '2026-03-28T12:05:00.000Z';

    await route.fulfill({
      body: JSON.stringify({ company }),
      contentType: 'application/json',
      status: 200,
    });
  });

  await page.route('**/companies/me/knowledge-base', async (route) => {
    const payload = route.request().postDataJSON() as { markdown: string };

    company.description = payload.markdown;
    company.updatedAt = '2026-03-28T12:10:00.000Z';

    await route.fulfill({
      body: JSON.stringify({ company }),
      contentType: 'application/json',
      status: 200,
    });
  });

  await test.step('sign in and land on the company page', async () => {
    await page.goto('/login?mode=signin&redirectTo=%2Fapp%2Fcompany');
    await expect(page.getByTestId('login-page')).toBeVisible();

    await page.getByTestId('login-signin-button').click();

    await page.waitForURL('**/app/company');
    await expect(page.getByTestId('company-page')).toBeVisible();
  });

  await test.step('render knowledge base in a user-friendly read mode', async () => {
    const knowledgeViewer = page.getByTestId('company-knowledge-viewer');

    await expect(knowledgeViewer).toBeVisible();
    await expect(
      knowledgeViewer.getByRole('heading', { name: 'Acme Dental' }),
    ).toBeVisible();
    await expect(knowledgeViewer.getByText('Limpeza')).toBeVisible();
    await expect(knowledgeViewer.getByText('Clareamento')).toBeVisible();
    await expect(
      page.getByTestId('company-knowledge-markdown-input'),
    ).toHaveCount(0);
  });

  await test.step('edit and save the basic company profile', async () => {
    await page.getByRole('button', { name: 'Editar perfil' }).click();

    await page.getByTestId('company-profile-name-input').fill('Acme Prime');
    await page
      .getByTestId('company-profile-business-type-input')
      .fill('Ortodontia premium');
    await page.getByTestId('company-profile-save-button').click();

    await expect(page.getByTestId('company-profile-success')).toBeVisible();
    await expect(page.getByTestId('company-profile-name-value')).toHaveText(
      'Acme Prime',
    );
    await expect(
      page.getByTestId('company-profile-business-type-value'),
    ).toHaveText('Ortodontia premium');
    await expect(
      page.getByTestId('company-knowledge-editor'),
    ).toHaveCount(0);
  });

  await test.step('edit and save the markdown knowledge base in a separate mode', async () => {
    const knowledgeViewer = page.getByTestId('company-knowledge-viewer');

    await page.getByTestId('company-knowledge-edit-button').click();

    const markdownInput = page.getByTestId('company-knowledge-markdown-input');
    await expect(markdownInput).toBeVisible();
    await expect(markdownInput).toHaveValue(company.description);

    await markdownInput.fill(
      '# Acme Prime\n\n## Serviços\n- Clareamento dental\n- Alinhadores\n\nEquipe especializada em atendimento consultivo.',
    );
    await page.getByTestId('company-knowledge-save-button').click();

    await expect(
      page.getByTestId('company-knowledge-markdown-input'),
    ).toHaveCount(0);
    await expect(knowledgeViewer).toBeVisible();
    await expect(
      knowledgeViewer.getByRole('heading', { name: 'Acme Prime' }),
    ).toBeVisible();
    await expect(knowledgeViewer.getByText('Clareamento dental')).toBeVisible();
    await expect(knowledgeViewer.getByText('Alinhadores')).toBeVisible();
  });
});
