import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

function normalizePositiveInteger(value: unknown, fallback: number): unknown {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  return Number.NaN;
}

export class ListManagedContactsQueryDto {
  @IsInt()
  @Min(1)
  @Transform(({ value }) => normalizePositiveInteger(value, 1))
  page = 1;

  @IsInt()
  @Min(1)
  @Max(50)
  @Transform(({ value }) => normalizePositiveInteger(value, 20))
  pageSize = 20;
}
