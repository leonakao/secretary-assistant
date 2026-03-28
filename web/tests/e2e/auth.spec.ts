import { expect, test } from '@playwright/test';

test('home page exposes the sign-in entry point', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('link', { name: 'Sign in to dashboard' }),
  ).toHaveAttribute(
    'href',
    '/login?mode=signin',
  );
});

test('app redirects unauthenticated users to the dedicated login page', async ({
  page,
}) => {
  await page.goto('/app');

  await expect(page).toHaveURL(/\/login\?mode=signin&redirectTo=%2Fapp$/);
  await expect(page.getByTestId('login-page')).toBeVisible();
});

test('mock signup uses the dedicated login route and reaches the app entry point', async ({
  page,
}) => {
  await page.goto('/login?mode=signup');
  await expect(page.getByTestId('login-page')).toBeVisible();

  await page.getByTestId('login-signup-button').click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByTestId('app-shell')).toBeVisible();
});
