import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { createOnboardingCompany } from '../../../api/onboarding.api';
import { useApiClient } from '~/lib/api-client-context';

interface CompanyBootstrapFormProps {
  onSuccess: () => void;
}

export function CompanyBootstrapForm({ onSuccess }: CompanyBootstrapFormProps) {
  const client = useApiClient();
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createOnboardingCompany({ name: name.trim(), businessType: businessType.trim() }, client);
      onSuccess();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Failed to create company. Please try again.',
      );
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="company-name"
          className="block text-sm font-medium text-foreground"
        >
          Company name
        </label>
        <input
          id="company-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Ltda."
          disabled={isSubmitting}
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 disabled:opacity-50"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="business-type"
          className="block text-sm font-medium text-foreground"
        >
          Type of business
        </label>
        <input
          id="business-type"
          type="text"
          required
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          placeholder="e.g. Plumbing, Catering, Beauty salon"
          disabled={isSubmitting}
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 disabled:opacity-50"
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isSubmitting || !name.trim() || !businessType.trim()}
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Setting up your company...
          </>
        ) : (
          'Continue'
        )}
      </Button>
    </form>
  );
}
