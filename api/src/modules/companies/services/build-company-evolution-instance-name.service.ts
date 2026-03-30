import { Injectable } from '@nestjs/common';

@Injectable()
export class BuildCompanyEvolutionInstanceNameService {
  execute(companyName: string): string {
    const slug = companyName
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, 80);

    return `sa-company-${slug || 'empresa'}`;
  }
}
