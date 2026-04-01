import { Button } from '~/components/ui/button';

interface OnboardingChatErrorBannerProps {
  error: string | null;
  showRetry: boolean;
  onRetry: (() => void) | null;
}

export function OnboardingChatErrorBanner({
  error,
  showRetry,
  onRetry,
}: OnboardingChatErrorBannerProps) {
  if (!error) {
    return null;
  }

  return (
    <div className="px-6 pb-2" data-testid="onboarding-chat-error-banner">
      <div className="mx-auto max-w-3xl rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
        <div className="flex items-center justify-between gap-3">
          <span>{error}</span>
          {showRetry && onRetry ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              data-testid="onboarding-chat-retry-button"
            >
              Tentar novamente
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
