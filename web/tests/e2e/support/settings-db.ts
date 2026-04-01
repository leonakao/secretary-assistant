import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createDeterministicSettingsId,
  createSettingsOwnerIdentity,
  slugifySettingsValue,
  type E2EIdentity,
} from './settings-auth';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const COMPOSE_FILE = join(
  REPO_ROOT,
  'docker-compose.onboarding-validation.yaml',
);
const DB_SERVICE = 'onboarding-validation-db';

export interface SettingsDbContactSeed {
  email?: string | null;
  id?: string;
  instagram?: string | null;
  name: string;
  phone?: string | null;
}

export interface SettingsDbScenarioOptions {
  agentEnabled?: boolean;
  businessType?: string | null;
  companyId?: string;
  companyName?: string;
  contacts?: SettingsDbContactSeed[];
  description?: string | null;
  evolutionInstanceName?: string | null;
  identity?: E2EIdentity;
  replyListEntries?: string[];
  replyListMode?: 'blacklist' | 'whitelist' | null;
  replyNamePattern?: string | null;
  replyScope?: 'all' | 'specific';
  step?: 'onboarding' | 'running';
}

export interface SettingsDbScenario {
  companyId: string;
  contactIds: string[];
  identity: E2EIdentity;
  userId: string;
  userCompanyId: string;
}

interface SettingsScenarioIdsInput {
  companyId?: string;
  contacts?: SettingsDbContactSeed[];
  identity: E2EIdentity;
}

export function buildSettingsScenarioIds(
  input: SettingsScenarioIdsInput,
): Pick<SettingsDbScenario, 'companyId' | 'contactIds' | 'userCompanyId' | 'userId'> {
  const identityKey = slugifySettingsValue(input.identity.claims.sub);
  const companyId =
    input.companyId ??
    createDeterministicSettingsId('settings-company', identityKey);
  const userId = createDeterministicSettingsId('settings-user', identityKey);
  const userCompanyId = createDeterministicSettingsId(
    'settings-user-company',
    userId,
    companyId,
  );
  const contactIds = (input.contacts ?? []).map((contact, index) => {
    if (contact.id) {
      return contact.id;
    }

    return createDeterministicSettingsId(
      'settings-contact',
      companyId,
      String(index),
      contact.name,
      contact.phone ?? '',
      contact.email ?? '',
      contact.instagram ?? '',
    );
  });

  return {
    companyId,
    contactIds,
    userCompanyId,
    userId,
  };
}

function sqlString(value: string | null | undefined): string {
  if (value == null) {
    return 'NULL';
  }

  return `'${value.replace(/'/g, "''")}'`;
}

function sqlBoolean(value: boolean): string {
  return value ? 'TRUE' : 'FALSE';
}

function sqlJson(value: unknown): string {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function runSql(sql: string): string {
  return execFileSync(
    'docker',
    [
      'compose',
      '-f',
      COMPOSE_FILE,
      'exec',
      '-T',
      DB_SERVICE,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-t',
      '-A',
      '-c',
      sql,
    ],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    },
  ).trim();
}

function findExistingUserId(identity: E2EIdentity): string | null {
  return (
    runSql(
      [
        'SELECT id',
        'FROM users',
        `WHERE auth_provider_id = ${sqlString(identity.claims.sub)}`,
        `   OR email = ${sqlString(identity.claims.email)}`,
        'LIMIT 1;',
      ].join('\n'),
    ) || null
  );
}

export function resetSettingsDbScenario(companyId: string): void {
  runSql(
    [
      `DELETE FROM contacts WHERE company_id = ${sqlString(companyId)};`,
      `DELETE FROM user_companies WHERE company_id = ${sqlString(companyId)};`,
      `DELETE FROM companies WHERE id = ${sqlString(companyId)};`,
    ].join('\n'),
  );
}

export function prepareSettingsDbScenario(
  options: SettingsDbScenarioOptions = {},
): SettingsDbScenario {
  const identity = options.identity ?? createSettingsOwnerIdentity();
  const contacts = options.contacts ?? [];
  const ids = buildSettingsScenarioIds({
    companyId: options.companyId,
    contacts,
    identity,
  });
  const userId = findExistingUserId(identity) ?? ids.userId;
  const companyId = ids.companyId;
  const userCompanyId = ids.userCompanyId;

  resetSettingsDbScenario(companyId);

  runSql(
    [
      `INSERT INTO users (id, auth_provider_id, email, name, phone, created_at, updated_at, deleted_at)`,
      `VALUES (${sqlString(userId)}, ${sqlString(identity.claims.sub)}, ${sqlString(identity.claims.email)}, ${sqlString(identity.claims.name)}, NULL, NOW(), NOW(), NULL)`,
      'ON CONFLICT (id) DO UPDATE',
      `SET auth_provider_id = EXCLUDED.auth_provider_id, email = EXCLUDED.email, name = EXCLUDED.name, phone = NULL, deleted_at = NULL, updated_at = NOW();`,
      `UPDATE users SET auth_provider_id = ${sqlString(identity.claims.sub)}, email = ${sqlString(identity.claims.email)}, name = ${sqlString(identity.claims.name)}, deleted_at = NULL, updated_at = NOW() WHERE id = ${sqlString(userId)};`,
      `INSERT INTO companies (id, name, description, business_type, is_clients_support_enabled, agent_reply_scope, agent_reply_name_pattern, agent_reply_list_mode, agent_reply_list_entries, evolution_instance_name, step, created_at, updated_at, deleted_at)`,
      `VALUES (${sqlString(companyId)}, ${sqlString(options.companyName ?? 'Settings E2E Co.')}, ${sqlString(options.description ?? 'Settings E2E company')}, ${sqlString(options.businessType ?? 'Clínica odontológica')}, ${sqlBoolean(options.agentEnabled ?? false)}, ${sqlString(options.replyScope ?? 'all')}, ${sqlString(options.replyNamePattern ?? null)}, ${sqlString(options.replyListMode ?? null)}, ${sqlJson(options.replyListEntries ?? [])}, ${sqlString(options.evolutionInstanceName ?? null)}, ${sqlString(options.step ?? 'running')}, NOW(), NOW(), NULL);`,
      `INSERT INTO user_companies (id, user_id, company_id, role, created_at, updated_at, deleted_at)`,
      `VALUES (${sqlString(userCompanyId)}, ${sqlString(userId)}, ${sqlString(companyId)}, 'owner', NOW(), NOW(), NULL);`,
    ].join('\n'),
  );

  const contactIds = contacts.map((contact, index) => {
    const contactId = ids.contactIds[index]!;

    runSql(
      [
        `INSERT INTO contacts (id, company_id, name, email, phone, instagram, ignore_until, preferred_user_id, created_at, updated_at, deleted_at)`,
        `VALUES (${sqlString(contactId)}, ${sqlString(companyId)}, ${sqlString(contact.name)}, ${sqlString(contact.email ?? null)}, ${sqlString(contact.phone ?? null)}, ${sqlString(contact.instagram ?? null)}, NULL, NULL, NOW(), NOW(), NULL);`,
      ].join('\n'),
    );

    return contactId;
  });

  return {
    companyId,
    contactIds,
    identity,
    userId,
    userCompanyId,
  };
}
