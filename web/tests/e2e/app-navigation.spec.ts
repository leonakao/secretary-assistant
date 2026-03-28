import { expect, test } from '@playwright/test';

const COMPLETED_SESSION_USER = {
  authProviderId: 'auth0|existing-owner',
  company: {
    id: 'company-existing-owner',
    name: 'Existing Owner Co.',
    role: 'owner' as const,
    step: 'running' as const,
  },
  createdAt: '2026-03-28T00:00:00.000Z',
  email: 'existing-owner@secretary-assistant.test',
  id: 'user-existing-owner',
  name: 'Existing Validation Owner',
  onboarding: {
    requiresOnboarding: false,
    step: 'complete' as const,
  },
  phone: null,
  updatedAt: '2026-03-28T00:00:00.000Z',
};

const COMPLETED_MANAGED_COMPANY = {
  businessType: 'Clínica odontológica',
  description: '# Existing Owner Co.\n\n## Atendimento\n- Consultas',
  id: 'company-existing-owner',
  name: 'Existing Owner Co.',
  step: 'running' as const,
  updatedAt: '2026-03-28T12:00:00.000Z',
};

test('existing owner can navigate across the authenticated app shell', async ({
  page,
}) => {
  await page.route('**/users/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify(COMPLETED_SESSION_USER),
    });
  });
  await page.route('**/companies/me', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      body: JSON.stringify({ company: COMPLETED_MANAGED_COMPANY }),
      contentType: 'application/json',
      status: 200,
    });
  });

  await test.step('sign in through the mocked auth flow', async () => {
    await page.goto('/login?mode=signin');
    await expect(page.getByTestId('login-page')).toBeVisible();

    await page.getByTestId('login-signin-button').click();

    await page.waitForURL('**/app');
    await expect(page.getByTestId('app-home-page')).toBeVisible();
  });

  await test.step('navigate to company from the authenticated shell', async () => {
    await page.getByRole('link', { name: 'Minha empresa' }).click();

    await expect(page).toHaveURL(/\/app\/company$/);
    await expect(page.getByTestId('company-page')).toBeVisible();
    await expect(page.getByTestId('company-knowledge-viewer')).toBeVisible();
  });

  await test.step('navigate to contacts from the authenticated shell', async () => {
    await page.getByRole('link', { name: 'Contatos' }).click();

    await expect(page).toHaveURL(/\/app\/contacts$/);
    await expect(page.getByTestId('contacts-page')).toBeVisible();
    await expect(page.getByText('Contact workspace placeholder')).toBeVisible();
  });

  await test.step('navigate to settings from the authenticated shell', async () => {
    await page.getByRole('link', { name: 'Configurações' }).click();

    await expect(page).toHaveURL(/\/app\/settings$/);
    await expect(page.getByTestId('settings-page')).toBeVisible();
    await expect(page.getByText('Settings placeholder')).toBeVisible();
  });

  await test.step('return to app home from the authenticated shell', async () => {
    await page.getByRole('link', { name: 'Dashboard' }).click();

    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByTestId('app-home-page')).toBeVisible();
    await expect(page.getByText('Workspace overview')).toBeVisible();
  });
});

test('unauthenticated deep link to company returns to the same app page after sign-in', async ({
  page,
}) => {
  await page.route('**/users/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify(COMPLETED_SESSION_USER),
    });
  });
  await page.route('**/companies/me', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      body: JSON.stringify({ company: COMPLETED_MANAGED_COMPANY }),
      contentType: 'application/json',
      status: 200,
    });
  });

  await test.step('redirect the unauthenticated deep link to login while preserving returnTo', async () => {
    await page.goto('/app/company');

    await expect(page).toHaveURL(
      /\/login\?mode=signin&redirectTo=%2Fapp%2Fcompany$/,
    );
    await expect(page.getByTestId('login-page')).toBeVisible();
  });

  await test.step('complete mocked sign-in and return to the original deep link', async () => {
    await page.getByTestId('login-signin-button').click();

    await page.waitForURL('**/app/company');
    await expect(page.getByTestId('company-page')).toBeVisible();
    await expect(page.getByTestId('company-knowledge-viewer')).toBeVisible();
  });
});
