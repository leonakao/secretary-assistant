import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';

export class UpdateManagedCompanyKnowledgeBaseDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  markdown: string;
}
