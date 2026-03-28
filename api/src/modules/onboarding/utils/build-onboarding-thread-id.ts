export function buildOnboardingThreadId(
  userId: string,
  companyId: string,
): string {
  return `onboarding:${companyId}:${userId}`;
}
