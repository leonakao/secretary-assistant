import { describe, expect, it } from 'vitest';
import { resolveTurnDelayMs } from './interview-driver';

describe('resolveTurnDelayMs', () => {
  it('uses the default delay when the env value is missing or invalid', () => {
    expect(resolveTurnDelayMs(undefined)).toBe(0);
    expect(resolveTurnDelayMs('not-a-number')).toBe(0);
    expect(resolveTurnDelayMs('-1')).toBe(0);
  });

  it('uses the configured delay when the env value is valid', () => {
    expect(resolveTurnDelayMs('22000')).toBe(22000);
  });
});
