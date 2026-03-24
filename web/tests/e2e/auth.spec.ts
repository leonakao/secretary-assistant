import { expect, test } from '@playwright/test';

const AUTH0_DOMAIN = process.env.VITE_AUTH0_DOMAIN;
const AUTH0_PASSWORD = process.env.E2E_AUTH0_PASSWORD;
const AUTH0_EMAIL_DOMAIN = process.env.E2E_AUTH0_EMAIL_DOMAIN || 'teste.com';
const AUTH0_EMAIL_PREFIX = process.env.E2E_AUTH0_EMAIL_PREFIX || 'playwright';

function buildTestCredentials() {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;

  return {
    email: `${AUTH0_EMAIL_PREFIX}-${uniqueSuffix}@${AUTH0_EMAIL_DOMAIN}`,
    password: AUTH0_PASSWORD || 'Example123!',
  };
}

async function fillAuth0Credentials(params: {
  email: string;
  page: import('@playwright/test').Page;
  password: string;
}) {
  const { email, page, password } = params;

  await page.waitForURL(new RegExp(AUTH0_DOMAIN || 'auth0\\.com'), {
    timeout: 30000,
  });

  const emailInput = page
    .locator('input[name="email"], input[name="username"], input[type="email"]')
    .first();
  const passwordInput = page.locator('input[name="password"]').first();

  await emailInput.waitFor({ state: 'visible', timeout: 30000 });
  await emailInput.fill(email);
  await passwordInput.fill(password);

  const submitButton = page
    .locator('button[type="submit"], button[name="action"]')
    .first();

  await submitButton.click();
}

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
  await expect(
    page.getByRole('heading', { name: 'Sign in to your dashboard' }),
  ).toBeVisible();
});

test('sign up creates a user and sign in reaches the protected dashboard', async ({
  page,
}) => {
  const credentials = buildTestCredentials();

  await page.goto('/login?mode=signup');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await fillAuth0Credentials({
    email: credentials.email,
    page,
    password: credentials.password,
  });

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole('heading', { name: new RegExp(`Welcome back,`, 'i') }),
  ).toBeVisible();
  await expect(page.getByText(credentials.email).first()).toBeVisible();

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/login?mode=signin');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await fillAuth0Credentials({
    email: credentials.email,
    page,
    password: credentials.password,
  });

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(credentials.email).first()).toBeVisible();
});
