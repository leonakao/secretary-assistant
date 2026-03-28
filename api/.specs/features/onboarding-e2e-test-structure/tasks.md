# Onboarding E2E Test Structure – API Tasks

**Design**: `.specs/features/onboarding-e2e-test-structure/design.md`
**Status**: Draft

---

## Execution Plan

```text
Phase 1 (Sequential – Environment + Deterministic Auth):
  T1 -> T2 -> T3 -> T4

Phase 2 (Sequential – Session Bootstrap Verification):
  T4 -> T5 -> T6
```

---

## Task Breakdown

### T1: Define isolated onboarding-validation API environment config

**What**: Document and establish the API-side config model for a dedicated onboarding-validation stack with separate DB/auth settings from normal development.
**Where**: API test docs, env docs, and stack config touchpoints
**Depends on**: None

**Done when**:
- [ ] the design specifies a dedicated test stack rather than reuse of the active local stack
- [ ] test-only env vars are separated from normal dev env vars
- [ ] the API test port and DB isolation approach are documented
- [ ] deterministic auth mode is scoped to the isolated stack only

### T2: Add an environment-gated E2E auth mode to `AuthService`

**What**: Extend bearer-token authentication so test runs can bypass Auth0 JWKS verification through an explicit E2E-only mode.
**Where**: `api/src/modules/auth/services/auth.service.ts`
**Depends on**: T1

**Done when**:
- [ ] deterministic auth mode is disabled by default
- [ ] normal Auth0 verification remains unchanged when the mode is off
- [ ] deterministic tokens can be mapped into the existing session claims shape
- [ ] the same `findOrCreateUser()` path is reused

### T3: Document and validate the deterministic token contract

**What**: Define the minimal claim shape expected from the web mock auth provider and reject malformed E2E tokens clearly.
**Where**: auth module code and tests
**Depends on**: T2

**Done when**:
- [ ] required claims are `sub`, `email`, and `name`
- [ ] malformed E2E tokens return `401`
- [ ] valid E2E tokens authenticate successfully when the mode is enabled
- [ ] the contract is documented in the relevant app docs or test docs

### T4: Add auth guard regression tests for enabled and disabled modes

**What**: Cover `SessionGuard` and `AuthService` behavior for real mode, disabled E2E mode, and enabled E2E mode.
**Where**: auth guard/service spec files
**Depends on**: T3

**Done when**:
- [ ] disabled E2E mode rejects deterministic tokens
- [ ] enabled E2E mode accepts deterministic tokens
- [ ] session claims are attached consistently to the request
- [ ] existing auth tests still pass

### T5: Verify session bootstrap and onboarding endpoints with deterministic auth

**What**: Prove that an authenticated fresh test user can reach `GET /users/me` and the onboarding endpoints through the deterministic auth path.
**Where**: users/onboarding integration or controller tests
**Depends on**: T4

**Done when**:
- [ ] `GET /users/me` succeeds with a valid deterministic token
- [ ] first bootstrap request can create a user from that token
- [ ] onboarding endpoints are reachable with the same session shape
- [ ] failures remain stage-specific rather than collapsing into generic auth errors

### T6: Confirm no extra test-only onboarding endpoint is required for v1

**What**: Validate during implementation that existing onboarding contracts provide enough state for the web evidence/report flow; only extend existing contracts if a concrete gap appears.
**Where**: onboarding controller/use-case touchpoints as needed
**Depends on**: T5

**Done when**:
- [ ] the team has verified whether existing onboarding responses are sufficient for the web report flow
- [ ] if a gap exists, it is solved by extending an existing response rather than adding a parallel report endpoint
- [ ] no hidden shortcut endpoint is introduced for the onboarding test
