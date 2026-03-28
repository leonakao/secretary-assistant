export interface ManagedCompanyResult {
  id: string;
  name: string;
  businessType: string | null;
  description: string | null;
  step: 'onboarding' | 'running';
  updatedAt: Date;
}

export interface ManagedCompanyResponse {
  company: ManagedCompanyResult;
}
