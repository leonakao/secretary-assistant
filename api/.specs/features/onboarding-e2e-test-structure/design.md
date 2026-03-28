# Onboarding E2E Test Structure

## Overview

This slice gives the repository a deterministic full-stack auth path for onboarding validation and confirms that the existing onboarding API contracts remain the real path exercised by the browser test.

The API owns:

- session bootstrap for the fresh test user
- user creation or reuse from the approved auth path
- onboarding state and routing contracts
- company bootstrap creation
- onboarding message progression until completion

The main new backend requirement is deterministic auth. The current onboarding endpoints already provide the functional flow that the web test needs.

## Existing API Anchors

- `api/src/modules/auth/services/auth.service.ts`
  - currently validates Auth0 ID tokens via JWKS only
- `api/src/modules/auth/guards/session.guard.ts`
  - attaches the authenticated session to protected requests
- `api/src/modules/users/controllers/users-me.controller.ts`
  - current session bootstrap endpoint used by `web`
- `api/src/modules/onboarding/controllers/onboarding-company.controller.ts`
  - company bootstrap entrypoint
- `api/src/modules/onboarding/controllers/onboarding-state.controller.ts`
  - onboarding state entrypoint
- `api/src/modules/onboarding/controllers/onboarding-messages.controller.ts`
  - chat send entrypoint
- `api/src/modules/onboarding/services/onboarding-conversation.service.ts`
  - current conversation persistence and agent invocation

## Discovery Result: Auth Does Not Exist End to End Today

There is no deterministic full-stack auth mode today.

What exists:

- `web` can enable a mock auth provider with `VITE_E2E_AUTH_MOCK=true`
- the mock provider returns fixed demo tokens like `mock-e2e-signup-token`

What blocks the full flow:

- `api` still verifies real Auth0 JWTs only
- those fixed mock tokens cannot pass `SessionGuard`
- the current mock identities are not fresh per run

Conclusion:

- deterministic auth must be added to `api`
- the design should make it explicitly test-only and environment-gated

## Design Goals

1. Enable a repeatable fresh-user auth path without third-party login UI.
2. Keep the existing protected API endpoints and onboarding logic as the real exercised path.
3. Avoid production risk by gating the deterministic auth path strictly to test/local environments.
4. Preserve the current session bootstrap contract used by `web`.
5. Keep onboarding validation focused on real route and domain behavior, not a parallel test-only backend.

## Environment Model

### Recommendation for v1

Use an isolated onboarding-validation stack, not the developer's active local stack.

Rationale:

- onboarding validation writes real users, companies, and conversation history
- deterministic auth mode must be enabled for the validation stack only
- developers may already be running API and database services on standard local ports
- a shared local database would create cleanup and contamination risk

For v1, the pragmatic recommendation is:

- isolated `api`
- isolated `db`
- isolated container namespace or compose project name
- dedicated env file set for test runs

This should be a temporary stack started only for onboarding validation, not a permanently separate environment to maintain.

### Why not reuse the normal local stack

Reusing the active local stack would create avoidable conflicts in:

- database state
- auth mode
- test identities
- service ports
- developer debugging sessions already attached to the same stack

Given the user concern, the isolated-stack option is the safer and still-pragmatic v1 choice.

### Invocation and scoping

The stack should be invoked with explicit test scoping, for example:

- a dedicated compose project name such as `secretary-assistant-e2e`
- test-specific env files
- dedicated API and database ports if host exposure is needed

The key rule is that onboarding validation must not implicitly mutate the default local stack.

### Port strategy

Recommended stance:

- do not bind the isolated API to the default dev port if that would collide with a running local API
- expose a dedicated API port for the test stack, for example `3300`
- expose a dedicated database host port only if a host-side tool needs direct access

Container-internal networking should stay isolated by project namespace even when host ports are exposed.

### Env separation

`api` needs explicit test-only configuration separation from dev:

- deterministic auth mode flag, enabled only in the isolated test stack
- dedicated database connection settings
- any test-only secrets or token parsing options kept outside normal `.env`

The isolated stack should not inherit test auth mode from a developer's normal API environment.

## Deterministic Auth Mode

### Enablement

Add an explicit environment gate, for example:

```text
E2E_AUTH_MODE=true
```

Rules:

- disabled by default
- must never be enabled in production
- when disabled, existing Auth0 verification remains unchanged

### AuthService strategy

`AuthService.authenticateBearerToken()` should support two code paths:

1. normal mode
   - verify Auth0 JWT via JWKS
2. e2e mode
   - accept the approved deterministic bearer token shape
   - map claims to the existing `findOrCreateUser()` path

The deterministic mode should still end in the same user domain model and session shape as real auth.

### Token contract

The exact token shape should be simple and browser-producible because the mock web auth provider must generate it without a server-side signing round trip.

Recommended contract:

- prefix token clearly as E2E-only
- encode `sub`, `email`, and `name`
- include a unique nonce or run id for fresh-user identity generation

Example shape:

```text
e2e.<base64url-json-claims>
```

Required claims:

- `sub`
- `email`
- `name`

Security stance:

- no attempt to make this production-grade
- safety comes from the explicit environment gate
- deterministic mode is for local/CI validation only

### Interaction with environment isolation

Deterministic auth mode is acceptable only because it is confined to the isolated onboarding-validation stack.

It must not be turned on in the normal developer API process. This is the main reason the environment model recommends isolated stack execution instead of reusing the default dev environment.

## Fresh-User Lifecycle

The single supported v1 path is a fresh-user signup-like flow.

API behavior should therefore support:

- first authenticated request creates the user row if it does not exist
- repeated requests for the same deterministic identity reuse that user row
- unique identity generation in `web` avoids polluted state across runs

No dedicated cleanup endpoint is required for v1 if the identity is unique each run.

## Data Isolation

### Database

The isolated test stack should use its own database instance or database volume namespace.

Preferred v1 behavior:

- disposable database state for the onboarding-validation stack
- no truncation or cleanup against the developer's main local database

### Test identities

Even with isolated infrastructure, each run should still use unique fresh-user identities.

Reasons:

- simplifies reruns
- avoids hidden dependence on prior cleanup
- makes CI parallelism safer later

### Auth data

The deterministic auth token contract should exist only for the isolated test stack. There is no shared auth provider state to clean up if the identity is generated per run and resolved through `findOrCreateUser()`.

### Services

Only services required by onboarding validation should be enabled in the test stack. This keeps the isolated environment lighter and reduces the chance of interference with unrelated local development workflows.

## Onboarding Contracts

The approved validation flow should exercise the existing onboarding contracts:

- `GET /users/me`
- `GET /onboarding/state`
- `POST /onboarding/company`
- `POST /onboarding/messages`

The test should not call hidden reset endpoints or onboarding shortcuts.

## Completion Model

Completion remains backend-driven.

The API signal already exposed to `web` is sufficient for the primary route behavior:

- `onboarding.step === 'complete'` in onboarding responses
- subsequent `GET /users/me` should resolve the user as dashboard-eligible

The browser scenario will confirm the user-visible outcome by redirect to `/dashboard`.

## Evidence and Interview Review

The interview-review requirement does not require a parallel API reporting endpoint in the first slice.

Why:

- the web flow already sees every assistant and user message in order
- the test runner can persist transcript evidence on the client side
- onboarding completion is already represented in the existing response contracts

Preferred API stance for v1:

- keep the onboarding endpoints as-is unless implementation reveals a concrete evidence gap
- if evidence needs stronger canonical data, prefer extending existing onboarding responses with stable ids or timestamps rather than adding a test-only report endpoint

## Impacted Modules

### Auth

- `api/src/modules/auth/services/auth.service.ts`
- `api/src/modules/auth/guards/session.guard.ts`
- auth-related tests

### Users/session bootstrap

- `api/src/modules/users/controllers/users-me.controller.ts`
- `api/src/modules/users/use-cases/get-users-me.use-case.ts`

No contract redesign is expected here, but these paths must be verified with the deterministic auth mode.

### Onboarding

- `api/src/modules/onboarding/controllers/*.ts`
- `api/src/modules/onboarding/use-cases/*.ts`
- `api/src/modules/onboarding/services/onboarding-conversation.service.ts`

These modules should remain behaviorally unchanged for the first delivery slice, but they are still in scope for verification because the full-flow test relies on them.

## Failure Classification Support

The API should make auth failures distinguishable from onboarding failures.

Required outcomes:

- invalid or disabled E2E auth mode returns `401`
- valid E2E auth mode reaches the same session payload structure as real auth
- onboarding domain failures continue to surface as onboarding-specific errors rather than auth-shaped failures

This keeps the test reports stage-specific.

## Testing Scope in `api`

Primary API coverage for this slice:

- deterministic auth mode unit tests
- session guard behavior with deterministic tokens enabled and disabled
- session bootstrap regression test for `GET /users/me`
- optional lightweight integration coverage proving an E2E token can reach onboarding endpoints

The existing onboarding domain tests remain the main protection for conversation behavior.
