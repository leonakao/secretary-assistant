import { expect, test } from '@playwright/test';

test('home page exposes the login option in the header', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Login' })).toHaveAttribute(
    'href',
    '/login?mode=signin',
  );
});

test('dashboard redirects unauthenticated users to the dedicated login page', async ({
  page,
}) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login\?mode=signin&redirectTo=%2Fdashboard$/);
  await expect(page.getByTestId('login-page')).toBeVisible();
});

test('mock signup uses the dedicated login route and reaches onboarding', async ({
  page,
}) => {
  await page.goto('/login?mode=signup');
  await expect(page.getByTestId('login-page')).toBeVisible();

  await page.getByTestId('login-signup-button').click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByTestId('onboarding-page')).toBeVisible();
});
