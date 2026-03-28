import baseConfig from './playwright.config';

export default {
  ...baseConfig,
  timeout: 900000,
  testMatch: ['**/onboarding-validation.spec.ts'],
  fullyParallel: false,
} satisfies typeof baseConfig;
