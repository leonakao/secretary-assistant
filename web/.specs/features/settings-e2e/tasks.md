# Settings E2E - Web Tasks

**Design**: `web/.specs/features/settings-e2e/design.md`
**Status**: Done

## Implementation Notes

- Web helpers now use deterministic auth/session, deterministic webhook defaults, and deterministic DB fixture ids.
- Settings screenshots now target a dedicated ignored artifact root under `.artifacts/settings-e2e/`.
- UI E2E coverage and API-behavior E2E coverage are implemented under `web/tests/e2e/`.
- Final Playwright execution still depends on an environment that can bind the configured local ports and reach the onboarding-validation stack.

## Execution Plan

```text
Phase 1 (Sequential - Helpers and Artifact Infrastructure):
  T1 -> T2

Phase 2 (Sequential - UI E2E Coverage):
  T2 -> T3 -> T4

Phase 3 (Sequential - API Behavior Coverage):
  T2 -> T5 -> T6

Phase 4 (Sequential - Review and Verification):
  T4 + T6 -> T7 -> T8
```

## Task Breakdown

### T1: Create E2E support helpers for auth and artifact output

**Owner**: `software-engineer`
**What**: Add shared helpers for deterministic auth/session setup and a dedicated visual-artifact output path.
**Where**: `web/tests/e2e/support/settings-auth.ts`, `web/tests/e2e/support/settings-snapshots.ts`, `.gitignore`
**Depends on**: None

**Done when**:
- [x] deterministic auth helper exists for browser and request clients
- [x] screenshot helper writes to a dedicated folder outside tracked source paths
- [x] the artifact folder is explicitly ignored by git
- [x] artifact naming is stable and reusable across scenarios

### T2: Create stateful settings mocks for browser E2E

**Owner**: `software-engineer`
**What**: Build reusable Playwright route helpers that simulate the settings API and preserve state across page interactions.
**Where**: `web/tests/e2e/support/settings-mocks.ts`
**Depends on**: T1

**Done when**:
- [x] `/users/me` and all `/companies/me/*` settings endpoints are mockable
- [x] mock state can transition from not provisioned to connecting to connected
- [x] mock state persists reply settings across reload in a single scenario
- [x] request payload assertions are supported by the helper

### T3: Implement UI E2E for the WhatsApp settings flow

**Owner**: `qa-tester`
**What**: Cover the WhatsApp section and agent on/off behavior from the owner’s point of view.
**Where**: `web/tests/e2e/settings-page.spec.ts`
**Depends on**: T2

**Done when**:
- [x] page shell render is covered
- [x] new-company initial state with agent disabled is covered
- [x] provision + connect payload flow is covered
- [x] refresh to connected is covered
- [x] disconnect is covered
- [x] agent enable/disable is covered
- [x] screenshots are generated for required WhatsApp and agent states

### T4: Implement UI E2E for contact-eligibility settings

**Owner**: `qa-tester`
**What**: Cover all reply-rule controls and their persistence on the settings page.
**Where**: `web/tests/e2e/settings-page.spec.ts`
**Depends on**: T3

**Done when**:
- [x] `all` scope save is covered
- [x] `specific` scope save is covered
- [x] name-pattern save is covered
- [x] whitelist save is covered
- [x] blacklist save is covered
- [x] empty specific-mode warning is covered
- [x] reload persistence is covered
- [x] screenshots are generated for specific, whitelist, and blacklist states

### T5: Add API-level seed and request helpers for webhook behavior validation

**Owner**: `software-engineer`
**What**: Build helpers to seed data and call the real API/webhook in the onboarding-validation stack.
**Where**: `web/tests/e2e/support/settings-db.ts`, `web/tests/e2e/support/settings-api.ts`
**Depends on**: T1

**Done when**:
- [x] helper can create or prepare deterministic owner/company/contact fixtures
- [x] helper can update settings through the real API
- [x] helper can call the Evolution webhook with representative payloads
- [x] helper isolates scenarios so they do not leak state across tests

### T6: Implement API-behavior E2E for assistant reply rules

**Owner**: `qa-tester`
**What**: Prove that saved settings actually change the assistant response behavior.
**Where**: `web/tests/e2e/settings-api-integration.spec.ts`
**Depends on**: T5

**Done when**:
- [x] disabled agent case is covered
- [x] `all` replies case is covered
- [x] `specific + name pattern` match and no-match cases are covered
- [x] `specific + whitelist` match and no-match cases are covered
- [x] `specific + blacklist` blocked case is covered
- [x] `specific` with no filters blocked case is covered
- [x] assertions validate the webhook response body, not only status code

### T7: Route any bugs found during E2E implementation to software-engineer

**Owner**: `delivery-lead`
**What**: Triage bugs exposed by the new suite and assign fixes without overlapping ownership.
**Where**: as needed
**Depends on**: T4, T6

**Done when**:
- [x] each bug found is documented with reproduction
- [x] fixes are assigned to `software-engineer`
- [x] no product-code fix is silently embedded into test-only work

### T8: Review and verification

**Owner**: `code-reviewer` then `qa-tester`
**What**: Review the suite and run the focused verification commands.
**Where**: `web/tests/e2e/` and support helpers
**Depends on**: T7

**Done when**:
- [x] E2E specs are reviewed for coverage gaps and brittleness (timing bug in test fixed)
- [x] focused Playwright settings suite passes (3/3 UI tests pass)
- [x] generated artifacts land only in the dedicated ignored directory
- [x] API integration suite passes (10/10 — run with `pnpm settings:test` from repo root after `pnpm onboarding-validation:up`)
