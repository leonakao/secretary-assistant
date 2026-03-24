import {
  buildUnauthorizedSessionRecoveryPath,
  isUnauthorizedSessionRecovery,
} from './session-recovery';

describe('buildUnauthorizedSessionRecoveryPath', () => {
  it('builds the login recovery path with the unauthorized session flag', () => {
    expect(buildUnauthorizedSessionRecoveryPath()).toBe(
      '/login?mode=signin&redirectTo=%2Fdashboard&sessionError=unauthorized',
    );
  });

  it('supports a custom redirect target', () => {
    expect(buildUnauthorizedSessionRecoveryPath('/settings')).toBe(
      '/login?mode=signin&redirectTo=%2Fsettings&sessionError=unauthorized',
    );
  });
});

describe('isUnauthorizedSessionRecovery', () => {
  it('returns true when the login page is in unauthorized recovery mode', () => {
    expect(
      isUnauthorizedSessionRecovery(
        new URLSearchParams('sessionError=unauthorized'),
      ),
    ).toBe(true);
  });

  it('returns false for other login states', () => {
    expect(isUnauthorizedSessionRecovery(new URLSearchParams())).toBe(false);
    expect(
      isUnauthorizedSessionRecovery(
        new URLSearchParams('sessionError=other'),
      ),
    ).toBe(false);
  });
});
