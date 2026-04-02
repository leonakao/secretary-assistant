import { Transform } from 'class-transformer';
import { IsISO8601, IsOptional } from 'class-validator';

function normalizeOptionalIsoString(value: unknown): unknown {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateManagedContactIgnoreUntilDto {
  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => normalizeOptionalIsoString(value))
  ignoreUntil: string | null;
}
