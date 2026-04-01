import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Page, TestInfo } from '@playwright/test';

export const SETTINGS_SNAPSHOT_ROOT = join(
  process.cwd(),
  '../.artifacts/settings-e2e',
);

function sanitizeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getTestArtifactDir(testInfo: TestInfo): string {
  const titlePath = testInfo.titlePath.map(sanitizeSegment).filter(Boolean);
  const projectName = sanitizeSegment(testInfo.project.name || 'default');

  return join(SETTINGS_SNAPSHOT_ROOT, projectName, ...titlePath);
}

export async function captureSettingsSnapshot(params: {
  fullPage?: boolean;
  name: string;
  page: Page;
  testInfo: TestInfo;
}): Promise<string> {
  const artifactDir = getTestArtifactDir(params.testInfo);
  const fileName = `${sanitizeSegment(params.name)}.png`;
  const filePath = join(artifactDir, fileName);

  await mkdir(artifactDir, { recursive: true });
  await params.page.screenshot({
    fullPage: params.fullPage ?? true,
    path: filePath,
  });
  await params.testInfo.attach(`settings-snapshot:${params.name}`, {
    contentType: 'image/png',
    path: filePath,
  });

  return filePath;
}
