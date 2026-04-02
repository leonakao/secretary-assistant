import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ListManagedContactsQueryDto } from './list-managed-contacts-query.dto';
import { UpdateManagedContactIgnoreUntilDto } from './update-managed-contact-ignore-until.dto';

describe('contacts dto validation', () => {
  it('rejects invalid ignore-until payload types instead of clearing the state', () => {
    const dto = plainToInstance(UpdateManagedContactIgnoreUntilDto, {
      ignoreUntil: 123,
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(1);
    expect(dto.ignoreUntil).toBe(123);
  });

  it('allows null-like ignore-until values to clear the state', () => {
    const dto = plainToInstance(UpdateManagedContactIgnoreUntilDto, {
      ignoreUntil: '',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.ignoreUntil).toBeNull();
  });

  it('rejects invalid pagination params instead of silently defaulting them', () => {
    const dto = plainToInstance(ListManagedContactsQueryDto, {
      page: 'abc',
      pageSize: 'foo',
    });

    const errors = validateSync(dto);
    const propertyNames = errors.map((error) => error.property).sort();

    expect(propertyNames).toEqual(['page', 'pageSize']);
    expect(Number.isNaN(dto.page)).toBe(true);
    expect(Number.isNaN(dto.pageSize)).toBe(true);
  });

  it('defaults missing pagination params to the expected values', () => {
    const dto = plainToInstance(ListManagedContactsQueryDto, {});

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.pageSize).toBe(20);
  });
});
