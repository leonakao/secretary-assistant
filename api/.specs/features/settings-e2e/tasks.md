# Settings E2E - API Tasks

**Design**: `api/.specs/features/settings-e2e/design.md`
**Status**: API done

## Execution Plan

```text
Phase 1 (Sequential - Persistence and Contract):
  T1 -> T2 -> T3

Phase 2 (Sequential - Runtime Behavior):
  T3 -> T4

Phase 3 (Sequential - Verification):
  T2 + T4 -> T5
```

## Task Breakdown

### T1: Persist agent reply-settings on company records

**Owner**: `software-engineer`
**What**: Ensure the company model and migration layer persist all reply-eligibility fields required by settings and webhook behavior.
**Where**: `api/src/modules/companies/entities/company.entity.ts`, `api/src/database/migrations/`
**Depends on**: None

**Done when**:
- [x] company entity contains scope, name-pattern, list-mode, and list-entries fields
- [x] migration exists for existing databases
- [x] defaults align with a newly created company starting as `agent disabled` and reply scope `all`

### T2: Expose reply-settings in the managed settings API contract

**Owner**: `software-engineer`
**What**: Return and update reply-settings through the owner-managed settings endpoints.
**Where**: `api/src/modules/companies/controllers/companies-me-whatsapp.controller.ts`, `api/src/modules/companies/use-cases/get-managed-whatsapp-settings.use-case.ts`, `api/src/modules/companies/use-cases/update-managed-agent-reply-settings.use-case.ts`, DTOs and related tests
**Depends on**: T1

**Done when**:
- [x] `GET /companies/me/whatsapp-settings` returns all reply-settings fields
- [x] `POST /companies/me/agent-reply-settings` persists scope, name pattern, list mode, and list entries
- [x] controller and use-case tests cover the new contract

### T3: Keep WhatsApp-state operations behaviorally independent from agent on/off

**Owner**: `software-engineer`
**What**: Preserve the separation between WhatsApp connection lifecycle and agent enabled/disabled state in the backend contract.
**Where**: `api/src/modules/companies/use-cases/`, related controller tests
**Depends on**: T2

**Done when**:
- [x] toggling the agent does not mutate provisioned-instance or connection-status state
- [x] disconnect changes connection state without erasing reply-settings
- [x] tests protect this separation

### T4: Enforce reply-settings in incoming webhook handling

**Owner**: `software-engineer`
**What**: Apply the saved company settings before client auto-reply execution.
**Where**: `api/src/modules/chat/use-cases/incoming-message.use-case.ts`, related tests
**Depends on**: T3

**Done when**:
- [x] disabled agent returns no reply
- [x] `all` allows replies
- [x] `specific + name pattern` filters by match
- [x] `specific + whitelist` filters by match
- [x] `specific + blacklist` blocks on match
- [x] `specific` with no filters returns no automatic reply

### T5: Review and verification

**Owner**: `code-reviewer` then `qa-tester`
**What**: Review the backend changes and verify the focused API and webhook tests.
**Where**: `api/src/modules/companies/`, `api/src/modules/chat/`, `api/src/database/migrations/`
**Depends on**: T2, T4

**Done when**:
- [x] backend contract changes are reviewed for regressions and missing edge cases
- [x] focused unit/integration coverage passes for settings and webhook behavior
- [x] residual nondeterminism around positive replies is documented if still present
