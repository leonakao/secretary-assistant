import { describe, expect, it } from 'vitest';
import { BuildCompanyEvolutionInstanceNameService } from './build-company-evolution-instance-name.service';

describe('BuildCompanyEvolutionInstanceNameService', () => {
  it('builds a stable canonical instance name from company name', () => {
    const service = new BuildCompanyEvolutionInstanceNameService();

    expect(service.execute('Clínica São José 123')).toBe(
      'sa-company-clinica-sao-jose-123',
    );
  });

  it('falls back to a safe default when the company name has no slug characters', () => {
    const service = new BuildCompanyEvolutionInstanceNameService();

    expect(service.execute('!!!')).toBe('sa-company-empresa');
  });
});
