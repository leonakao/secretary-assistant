import { useEffect, useState } from 'react';
import { useApiClient } from '~/lib/api-client-context';
import {
  getManagedCompany,
  updateManagedCompanyKnowledgeBase,
  updateManagedCompanyProfile,
  type ManagedCompany,
} from '../../api/company.api';
import { CompanyKnowledgeEditor } from '../../components/company-knowledge-editor';
import { CompanyKnowledgeViewer } from '../../components/company-knowledge-viewer';
import { CompanyPageSkeleton } from '../../components/company-page-skeleton';
import { CompanyProfileForm } from '../../components/company-profile-form';

export function CompanyPage() {
  const client = useApiClient();
  const [company, setCompany] = useState<ManagedCompany | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEditingKnowledgeBase, setIsEditingKnowledgeBase] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void getManagedCompany(client).then(
      (response) => {
        if (cancelled) {
          return;
        }

        setCompany(response.company);
        setLoadError(null);
        setIsLoading(false);
      },
      (cause: unknown) => {
        if (cancelled) {
          return;
        }

        setLoadError(
          cause instanceof Error
            ? cause.message
            : 'Não foi possível carregar a empresa.',
        );
        setIsLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [client]);

  const handleProfileSave = async (input: {
    name: string;
    businessType: string | null;
  }) => {
    const response = await updateManagedCompanyProfile(input, client);
    setCompany(response.company);
  };

  const handleKnowledgeSave = async (markdown: string) => {
    const response = await updateManagedCompanyKnowledgeBase(
      { markdown },
      client,
    );
    setCompany(response.company);
    setIsEditingKnowledgeBase(false);
  };

  if (isLoading) {
    return <CompanyPageSkeleton />;
  }

  if (loadError) {
    return (
      <div className="space-y-6" data-testid="company-page">
        <section className="rounded-[1.75rem] border border-destructive/20 bg-card p-5 shadow-sm sm:rounded-[2rem] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-destructive">
            Minha empresa
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            Não foi possível carregar os dados da empresa
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            {loadError}
          </p>
        </section>
      </div>
    );
  }

  if (!company) {
    return null;
  }

  return (
    <div className="space-y-6 pb-8 sm:space-y-8 sm:pb-12" data-testid="company-page">
      <section className="grid gap-4 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] xl:items-start">
        <CompanyProfileForm company={company} onSave={handleProfileSave} />

        {isEditingKnowledgeBase ? (
          <CompanyKnowledgeEditor
            initialMarkdown={company.description}
            onCancel={() => setIsEditingKnowledgeBase(false)}
            onSave={handleKnowledgeSave}
          />
        ) : (
          <CompanyKnowledgeViewer
            markdown={company.description}
            onEdit={() => setIsEditingKnowledgeBase(true)}
          />
        )}
      </section>
    </div>
  );
}
