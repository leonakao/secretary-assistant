import { Transform } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export class UpdateManagedAgentReplySettingsDto {
  @IsIn(['all', 'specific'])
  scope: 'all' | 'specific';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => normalizeOptionalString(value))
  namePattern: string | null;

  @IsOptional()
  @IsIn(['whitelist', 'blacklist'])
  @Transform(({ value }) => normalizeOptionalString(value))
  listMode: 'whitelist' | 'blacklist' | null;

  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => normalizeStringArray(value))
  listEntries: string[];
}
