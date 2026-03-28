import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

function loadLocalEnv(): void {
  const envFilePath = join(process.cwd(), '.env');

  if (!existsSync(envFilePath)) {
    return;
  }

  const content = readFileSync(envFilePath, 'utf8');

  for (const line of content.split('\n')) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex);
    const value = trimmedLine.slice(separatorIndex + 1);

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const ONBOARDING_VALIDATION_BASE_URL =
  process.env.BASE_URL || 'http://127.0.0.1:4173';
const ONBOARDING_VALIDATION_API_BASE_URL =
  process.env.API_BASE_URL || 'http://127.0.0.1:3300';
const onboardingValidationBaseUrl = new URL(ONBOARDING_VALIDATION_BASE_URL);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  outputDir: './test-results/onboarding-validation',
  timeout: 120000,
  use: {
    baseURL: ONBOARDING_VALIDATION_BASE_URL,
    trace: 'on-first-retry',
  },
  webServer: {
    command:
      `VITE_API_BASE_URL=${ONBOARDING_VALIDATION_API_BASE_URL} ` +
      `VITE_AUTH0_APP_ORIGIN=${ONBOARDING_VALIDATION_BASE_URL} ` +
      'VITE_E2E_AUTH_MOCK=true ' +
      `pnpm exec react-router dev --host ${onboardingValidationBaseUrl.hostname} --port ${onboardingValidationBaseUrl.port}`,
    port: Number(onboardingValidationBaseUrl.port),
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
