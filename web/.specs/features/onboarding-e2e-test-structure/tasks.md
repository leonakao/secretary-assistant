# Onboarding E2E Test Structure – Web Tasks

**Design**: `.specs/features/onboarding-e2e-test-structure/design.md`
**Status**: Draft

---

## Execution Plan

```text
Phase 1 (Sequential – Environment + Auth):
  T1 -> T2 -> T3

Phase 2 (Sequential – Fixtures + Interview Driver):
  T3 -> T4 -> T5 -> T6

Phase 3 (Sequential – Evidence + Scenario):
  T6 -> T7 -> T8
```

---

## Task Breakdown

### T1: Define isolated onboarding-validation web environment config

**What**: Add the web-side test configuration model for a dedicated onboarding-validation stack, including separate base URL, API URL, and artifact scope.
**Where**: Playwright config and relevant web test docs
**Depends on**: None

**Done when**:
- [ ] Playwright is documented to target a dedicated test base URL
- [ ] test-only web config is separated from normal dev config
- [ ] onboarding-validation artifacts are scoped to a dedicated output path
- [ ] the design does not require a developer to stop the normal local stack first

### T2: Align mock auth provider with the deterministic test auth contract

**What**: Update the web mock auth path so `/login?mode=signup` creates a unique fresh-user identity compatible with the API test auth mode.
**Where**: `web/app/modules/auth/auth-provider.tsx`, auth-related helpers
**Depends on**: T1, API auth design approval

**Done when**:
- [ ] the mock auth path produces a fresh user identity for each run
- [ ] the login page remains the exercised route entry
- [ ] the resulting token/session shape matches the API deterministic auth contract
- [ ] non-E2E auth behavior remains unchanged

### T3: Add the onboarding company briefing artifact and parser

**What**: Create the markdown briefing fixture and deterministic parsing helpers used by the onboarding validation flow.
**Where**: `web/tests/e2e/fixtures/`, `web/tests/e2e/support/`
**Depends on**: T2

**Done when**:
- [ ] a markdown briefing file exists for the canonical test company
- [ ] the parser extracts company description, services, and client intents
- [ ] parsed briefing data can also supply bootstrap form values
- [ ] parser failures are explicit and test-visible

### T4: Add stable selectors for onboarding validation

**What**: Expose stable browser selectors for login, bootstrap, transcript rows, and chat composer.
**Where**: login and onboarding page components
**Depends on**: T3

**Done when**:
- [ ] Playwright can locate the bootstrap form deterministically
- [ ] Playwright can locate assistant and user transcript rows deterministically
- [ ] Playwright can locate the chat input and send action deterministically
- [ ] selectors do not rely on fragile presentational text only

### T5: Implement the deterministic interview driver

**What**: Build the support module that reads assistant prompts, classifies prompt intent, and produces coherent answers from the briefing.
**Where**: `web/tests/e2e/support/interview-driver.ts` and helper modules
**Depends on**: T4

**Done when**:
- [ ] the driver reads the latest assistant prompt from the real UI
- [ ] the driver maps supported prompt intents to briefing-backed answers
- [ ] the driver stops with an explicit failure on unknown prompts
- [ ] the driver supports enough turns to reach normal onboarding completion

### T6: Add interview evidence capture and reporting

**What**: Persist transcript, answer decisions, and completion status for each run.
**Where**: `web/tests/e2e/support/interview-report.ts`
**Depends on**: T5

**Done when**:
- [ ] briefing snapshot is saved with the run
- [ ] ordered transcript is saved
- [ ] per-turn prompt classification and chosen answers are saved
- [ ] failure bucket or success outcome is saved

### T7: Implement the full onboarding validation scenario

**What**: Add the Playwright scenario covering login, bootstrap, interview completion, dashboard redirect, and dashboard access.
**Where**: `web/tests/e2e/`
**Depends on**: T6

**Done when**:
- [ ] the scenario enters through the single fresh-user auth path
- [ ] bootstrap uses briefing-backed company data
- [ ] the interview loop runs until dashboard redirect
- [ ] direct dashboard access after completion no longer redirects to onboarding
- [ ] artifacts are written on both pass and failure
- [ ] the scenario targets the dedicated test base URL only

### T8: Add focused helper tests and documentation

**What**: Cover deterministic helper logic and document how developers run the onboarding validation stack without colliding with normal local development.
**Where**: helper test files and relevant testing docs
**Depends on**: T7

**Done when**:
- [ ] briefing parser has unit coverage
- [ ] prompt classification logic has unit coverage
- [ ] report generation has unit coverage
- [ ] developer docs explain required test env vars, dedicated ports/base URL, and how to inspect run artifacts
