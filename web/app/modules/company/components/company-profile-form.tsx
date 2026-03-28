import { useEffect, useState } from 'react';
import { Building2, PencilLine } from 'lucide-react';
import { Button } from '~/components/ui/button';
import type { ManagedCompany } from '../api/company.api';

interface CompanyProfileFormProps {
  company: ManagedCompany;
  onSave: (input: {
    name: string;
    businessType: string | null;
  }) => Promise<void>;
}

export function CompanyProfileForm({
  company,
  onSave,
}: CompanyProfileFormProps) {
  const [name, setName] = useState(company.name);
  const [businessType, setBusinessType] = useState(company.businessType ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setName(company.name);
    setBusinessType(company.businessType ?? '');
  }, [company.businessType, company.name]);

  const handleCancel = () => {
    setName(company.name);
    setBusinessType(company.businessType ?? '');
    setError(null);
    setSuccess(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await onSave({
        name: name.trim(),
        businessType: businessType.trim() || null,
      });
      setSuccess('Informações básicas atualizadas.');
      setIsEditing(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível salvar o perfil da empresa.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const profileRows = [
    {
      label: 'Nome da empresa',
      testId: 'company-profile-name-value',
      value: name.trim() || 'Não informado',
    },
    {
      label: 'Área de atuação',
      testId: 'company-profile-business-type-value',
      value: businessType.trim() || 'Ainda não definida',
    },
  ];

  return (
    <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-7 xl:sticky xl:top-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
            Perfil
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Informações básicas
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Dados estruturados usados para identificar o negócio no workspace.
          </p>
        </div>
        {!isEditing ? (
          <Button
            onClick={() => {
              setIsEditing(true);
              setSuccess(null);
            }}
            size="sm"
            variant="outline"
          >
            <PencilLine className="h-4 w-4" />
            Editar perfil
          </Button>
        ) : null}
      </div>

      {isEditing ? (
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">
              Nome da empresa
            </span>
            <input
              className="h-12 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
              data-testid="company-profile-name-input"
              disabled={isSaving}
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">
              Área de atuação
            </span>
            <input
              className="h-12 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
              data-testid="company-profile-business-type-input"
              disabled={isSaving}
              onChange={(event) => setBusinessType(event.target.value)}
              placeholder="Ex.: Clínica odontológica"
              value={businessType}
            />
          </label>
        </div>
      ) : (
        <dl className="mt-6 space-y-4 rounded-[1.75rem] border border-border/80 bg-muted/25 p-5">
          {profileRows.map((row) => (
            <div
              key={row.label}
              className="space-y-1 border-b border-border/70 pb-4 last:border-b-0 last:pb-0"
            >
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {row.label}
              </dt>
              <dd
                className="text-sm font-medium text-foreground"
                data-testid={row.testId}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {error ? (
        <p
          className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          data-testid="company-profile-error"
        >
          {error}
        </p>
      ) : null}

      {success ? (
        <p
          className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700"
          data-testid="company-profile-success"
        >
          {success}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {isEditing ? (
          <>
            <Button
              data-testid="company-profile-save-button"
              disabled={isSaving || !name.trim()}
              onClick={() => void handleSave()}
            >
              <Building2 className="h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar perfil'}
            </Button>
            <Button
              data-testid="company-profile-cancel-button"
              disabled={isSaving}
              onClick={handleCancel}
              size="sm"
              variant="outline"
            >
              Cancelar
            </Button>
          </>
        ) : (
          <div className="rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
            O perfil permanece em leitura até você iniciar uma edição.
          </div>
        )}
      </div>
    </section>
  );
}
