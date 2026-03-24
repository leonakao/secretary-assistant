import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

function loadLocalEnv(): void {
  const envFilePath = join(process.cwd(), '.env');
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

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  timeout: 120000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command:
      'VITE_AUTH0_APP_ORIGIN=http://localhost:5173 pnpm exec react-router dev --host localhost --port 5173',
    port: 5173,
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
