import {
  buildE2EAuthToken,
  createExistingSigninIdentity,
  createFreshSignupIdentity,
} from './e2e-auth';

describe('buildE2EAuthToken', () => {
  it('encodes claims with the API deterministic auth prefix', () => {
    const token = buildE2EAuthToken({
      email: 'owner@example.com',
      name: 'Owner',
      nonce: 'run-123',
      sub: 'e2e|owner|run-123',
    });

    expect(token).toMatch(/^e2e\./);
    const encodedClaims = token.slice(4);
    const decodedClaims = JSON.parse(
      Buffer.from(encodedClaims, 'base64url').toString('utf8'),
    );

    expect(decodedClaims).toEqual({
      email: 'owner@example.com',
      name: 'Owner',
      nonce: 'run-123',
      sub: 'e2e|owner|run-123',
    });
  });
});

describe('createFreshSignupIdentity', () => {
  it('creates a fresh deterministic identity for each signup run', () => {
    const firstIdentity = createFreshSignupIdentity();
    const secondIdentity = createFreshSignupIdentity();

    expect(firstIdentity.claims.sub).toMatch(/^e2e\|fresh-owner\|/);
    expect(firstIdentity.user.name).toBe('Onboarding Validation Owner');
    expect(firstIdentity.token).toMatch(/^e2e\./);
    expect(firstIdentity.claims.sub).not.toBe(secondIdentity.claims.sub);
    expect(firstIdentity.claims.email).not.toBe(secondIdentity.claims.email);
  });
});

describe('createExistingSigninIdentity', () => {
  it('returns a stable existing-owner identity for mock sign-in flows', () => {
    const identity = createExistingSigninIdentity();

    expect(identity.claims).toEqual({
      email: 'existing-owner@secretary-assistant.test',
      name: 'Existing Validation Owner',
      nonce: 'existing-owner',
      sub: 'e2e|existing-owner',
    });
    expect(identity.user.nickname).toBe('existing-owner');
  });
});
