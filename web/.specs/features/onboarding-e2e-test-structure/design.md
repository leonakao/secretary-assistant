# Onboarding E2E Test Structure

## Overview

This slice adds a reusable onboarding validation harness in `web/` that exercises the real onboarding route flow and preserves enough evidence to inspect interview quality after prompt changes.

The web app owns:

- the single fresh-user test auth entry path
- the browser automation flow through login, bootstrap, chat, and dashboard
- the interview driver that reads assistant prompts and answers from a stable company briefing
- the validation evidence written after each run

The API remains the source of truth for session bootstrap, onboarding state, chat progression, and completion.

## Existing Web Anchors

- `web/tests/e2e/auth.spec.ts`
  - existing Playwright setup and route smoke coverage
- `web/playwright.config.ts`
  - existing E2E runtime entrypoint
- `web/app/modules/auth/auth-provider.tsx`
  - already contains a web-only mock auth mode behind `VITE_E2E_AUTH_MOCK`
- `web/app/routes/login.tsx`
  - current fresh-user entry route
- `web/app/modules/onboarding/pages/onboarding-page/index.tsx`
  - current route-level onboarding loader and redirect behavior
- `web/app/modules/onboarding/pages/onboarding-page/components/company-bootstrap-form.tsx`
  - bootstrap form surface
- `web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat.tsx`
  - current transcript and message composer

## Current Constraint

`web` already has a partial deterministic auth seam, but it is not sufficient for full onboarding validation by itself:

- `VITE_E2E_AUTH_MOCK=true` enables local mock auth in the browser
- the current mock session uses fixed identities and fixed token strings
- the onboarding route still calls real backend session bootstrap through `GET /users/me`
- the backend currently verifies real Auth0 tokens only

Conclusion:

- `web` can support the UX side of deterministic auth today
- full-flow validation still depends on an API-side deterministic auth mode

## Design Goals

1. Reuse the real `/login -> /onboarding -> /dashboard` route flow.
2. Keep one fresh-user path for v1 and make it unique on every run.
3. Drive the onboarding interview from a stable markdown briefing instead of brittle hard-coded replies.
4. Preserve enough transcript and outcome evidence to review interview regressions after future prompt changes.
5. Fail with clear stage attribution: auth, bootstrap, interview, completion, or dashboard access.

## Environment Model

### Recommendation for v1

Use an isolated onboarding-validation environment, not the developer's active local stack.

Rationale:

- the validation flow mutates onboarding state and creates companies and users
- deterministic auth mode must be enabled for the test run and must not leak into normal development
- developers may already be using default local ports and databases
- Playwright artifacts and test identities should be attributable to a dedicated run, not mixed into day-to-day work

This does not require a fully separate permanent environment. For v1, the pragmatic model is:

- dedicated test-scoped API and database
- dedicated web base URL and port
- dedicated compose project name or equivalent container namespace
- dedicated test env files

### Stack shape

Recommended v1 shape:

- isolated `api`
- isolated `db`
- isolated `web` target for Playwright
- only the services required for onboarding validation

Do not require developers to shut down their normal stack first. The onboarding validation stack should be able to run alongside it.

### Invocation model

The validation flow should be invoked through a test-specific entrypoint, for example:

- a dedicated compose project name such as `secretary-assistant-e2e`
- a test-specific env file set
- a Playwright command that targets the test base URL only

The design should keep "bring up test stack" and "run browser validation" as explicit steps, even if later wrapped by a single command.

### Base URL and ports

Playwright should target a dedicated test base URL and dedicated ports.

Recommended stance:

- do not point Playwright at `http://localhost:5173` for this feature
- use a separate web port, for example `4173`
- use a separate API port, for example `3300`
- use a separate database port only if direct host access is needed; otherwise container-internal isolation is sufficient

This avoids collisions with the normal local web/API stack and makes failures easier to attribute.

### Env separation

`web` should have explicit test-only config separation from normal dev:

- `VITE_E2E_AUTH_MOCK=true` only in onboarding-validation runs
- dedicated `VITE_API_BASE_URL` for the isolated API
- dedicated Playwright base URL for the isolated web target

The onboarding validation flow must not infer test mode from ambient local settings.

### Artifact isolation

Artifacts are already planned under Playwright output. The environment model should keep them scoped to onboarding validation runs only.

Recommended path model:

```text
web/test-results/onboarding-validation/<run-id>/
```

This avoids collisions with other browser test outputs and makes rerun analysis easier.

## Fresh-User Auth Path

### Chosen path

The single supported auth path for the validation flow is:

- open `/login?mode=signup`
- run with `VITE_E2E_AUTH_MOCK=true`
- create a unique test identity on each run

This keeps the user-visible route flow intact while avoiding third-party UI automation.

### Web responsibilities

The mock auth provider should evolve from fixed demo identities to generated per-run identities:

- unique `sub`
- unique `email`
- stable `name`
- bearer token payload aligned with the API deterministic auth contract

The test should not seed localStorage manually as the primary path. The login page click should still be part of the exercised flow.

## Company Briefing Artifact

### Purpose

The interview driver needs a stable business context that survives prompt rewording and can also be reviewed by humans after a failed run.

### Proposed artifact

Add a markdown fixture in `web/tests/e2e/fixtures/`:

```text
web/tests/e2e/fixtures/onboarding-company-briefing.md
```

Minimum required sections:

- company description
- services offered
- what clients usually look for in chat

Recommended additional sections for better interview coverage:

- service area
- business hours
- booking or scheduling flow
- pricing approach
- cancellation or rescheduling policy
- common questions

### Usage model

The test runtime should parse this briefing into a deterministic answer source before the browser flow starts.

The same briefing should drive:

- bootstrap form values
- interview answers
- post-run analysis summary

## Interview Driver Design

### Goal

The test should answer many assistant questions coherently without depending on exact prompt text.

### Strategy

Use a deterministic prompt-intent driver:

1. read the latest assistant message from the transcript UI
2. classify the prompt into a known business intent
3. map that intent to the relevant answer from the company briefing
4. send the answer through the real chat input
5. repeat until redirect to `/dashboard`

### Intent categories

The first implementation should support the recurring onboarding intents already implied by the current flow:

- company overview
- services
- target customers
- service area
- business hours
- booking or scheduling
- pricing or payment
- cancellation or policies
- differentiators
- readiness to finish onboarding

### Unknown prompts

If the driver cannot classify a prompt confidently:

- capture the transcript
- mark the run as interview-classification failure
- stop instead of sending a guessed filler answer

That gives the team a reviewable signal when prompt changes drift beyond the current answer map.

## Transcript Access Model

The interview driver should rely on real UI transcript content, not hidden test hooks.

Recommended support in the UI layer:

- stable message locators or `data-testid` attributes for transcript rows
- stable role markers for assistant and user messages
- stable selectors for the company bootstrap form and chat composer

This keeps the Playwright layer resilient without introducing a parallel test-only interaction path.

## Evidence and Review Artifacts

### Required artifacts

Each validation run should persist:

- the parsed briefing snapshot used for the run
- ordered chat transcript
- per-turn classification and chosen answer
- completion outcome
- final route reached

### Proposed output location

Store run artifacts under Playwright output, for example:

```text
web/test-results/onboarding-validation/<timestamp-or-test-id>/
```

Suggested files:

- `briefing.md`
- `transcript.json`
- `transcript.md`
- `decision-log.json`
- `summary.md`

### Review value

This is what makes the feature more than a route E2E:

- the team can compare interview outcomes across prompt changes
- failures become diagnosable by the exact prompt that stopped matching
- successful runs still produce evidence of what the interviewer asked

## Page Object and Flow Structure

Recommended E2E support modules:

- `web/tests/e2e/pages/login-page.ts`
- `web/tests/e2e/pages/onboarding-page.ts`
- `web/tests/e2e/support/onboarding-briefing.ts`
- `web/tests/e2e/support/interview-driver.ts`
- `web/tests/e2e/support/interview-report.ts`

Responsibilities:

- page objects own selectors and low-level browser actions
- support modules own briefing parsing, intent resolution, and report writing
- the spec file owns the high-level scenario only

## Completion Model

The user-visible completion signal is approved and fixed:

- the interviewer stops asking onboarding questions
- the browser is redirected to `/dashboard`

The web test should treat redirect to `/dashboard` as the terminal success condition, then verify the user stays dashboard-eligible on a direct dashboard visit.

## API Dependencies

The web design assumes the API will provide one deterministic auth mode for test runs. No separate onboarding-only fake backend should be introduced.

Existing onboarding contracts are expected to remain the main path:

- `GET /users/me`
- `GET /onboarding/state`
- `POST /onboarding/company`
- `POST /onboarding/messages`

If implementation shows that interview evidence cannot be collected reliably from the current UI and responses, prefer small contract extensions to existing onboarding responses over a separate test endpoint.

## Failure Classification

The validation flow should surface explicit failure buckets:

- `auth`
- `routing-to-onboarding`
- `bootstrap`
- `interview-prompt-classification`
- `interview-message-send`
- `completion-not-reached`
- `dashboard-redirect`
- `dashboard-access-regression`

The summary artifact should include the final bucket.

## Data Isolation

### Test identities

Even with an isolated stack, the web flow should still generate unique fresh-user identities per run.

Reasons:

- reruns should not depend on cleanup timing
- failures can leave state behind without contaminating the next run
- identity uniqueness remains useful if the same isolated stack is reused for multiple runs in CI

### Database state

The preferred v1 isolation boundary is the database attached to the isolated test stack.

The browser flow should not rely on truncating a developer's normal database. If cleanup is needed, it should happen inside the test stack only.

### Services

Only the services needed for onboarding validation should run in the isolated stack. This keeps the environment smaller and reduces incidental collisions with unrelated developer services.

## Testing Scope in `web`

### Playwright

Primary coverage belongs in Playwright:

- fresh-user login path
- bootstrap form submission
- interview loop
- dashboard redirect and access
- artifact generation

### Lower-level tests

Add focused unit coverage only for deterministic helpers:

- briefing parser
- prompt intent classifier
- answer resolver
- report generator

The browser scenario remains the canonical proof.
