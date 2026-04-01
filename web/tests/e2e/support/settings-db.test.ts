import { describe, expect, it } from 'vitest';
import { buildSettingsScenarioIds } from './settings-db';
import { createSettingsOwnerIdentity } from './settings-auth';

describe('settings-db support', () => {
  it('builds deterministic scenario ids from the same identity and contacts', () => {
    const identity = createSettingsOwnerIdentity({
      key: 'db-seed',
      sub: 'e2e|settings|db-seed',
    });

    const first = buildSettingsScenarioIds({
      contacts: [
        {
          name: 'Maria Silva',
          phone: '+5511999999999',
        },
      ],
      identity,
    });
    const second = buildSettingsScenarioIds({
      contacts: [
        {
          name: 'Maria Silva',
          phone: '+5511999999999',
        },
      ],
      identity,
    });

    expect(first).toEqual(second);
  });

  it('keeps contact ids stable and distinct by contact position/content', () => {
    const identity = createSettingsOwnerIdentity({
      key: 'db-contacts',
      sub: 'e2e|settings|db-contacts',
    });

    const ids = buildSettingsScenarioIds({
      contacts: [
        {
          name: 'Maria Silva',
          phone: '+5511999999999',
        },
        {
          name: 'Joao Souza',
          phone: '+5511888888888',
        },
      ],
      identity,
    });

    expect(ids.contactIds).toHaveLength(2);
    expect(ids.contactIds[0]).not.toEqual(ids.contactIds[1]);
    expect(ids.companyId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
