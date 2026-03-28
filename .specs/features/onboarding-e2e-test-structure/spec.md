# Onboarding E2E Test Structure

## Summary

The product needs a reliable automated validation flow that verifies both the complete owner onboarding journey and the quality of the onboarding interview process itself.

- A fresh owner must be able to authenticate through a single supported fresh-user path, create their first company, complete the onboarding interview with the Onboarding Agent, and reach the company dashboard.
- The test flow must validate the real product behavior of the web onboarding experience rather than a separate mocked onboarding script.
- The onboarding interview contains many assistant questions, so the validation flow must support consistent, coherent answers across the full conversation without becoming brittle when the exact wording varies.
- The team must be able to re-run this flow after future prompt or interview changes and analyze whether the interview still behaves correctly and reaches completion.

## Problem

The onboarding feature is being developed across multiple steps and application boundaries, but the repository does not yet have a single test structure that proves the whole owner journey works from start to finish.

Without this:

- regressions can slip in between auth, company bootstrap, onboarding chat, and dashboard routing
- the team can validate isolated pieces while still missing flow-breaking integration problems
- long-form onboarding conversations are hard to verify consistently because the agent asks many questions over multiple turns
- prompt changes in the interviewer can silently degrade the interview quality or completion behavior without a repeatable way to inspect the outcome
- confidence in onboarding releases depends on manual checking

## Goal

Establish a deterministic automated validation capability that proves a new owner can complete the full onboarding flow, become dashboard-eligible, and produce an onboarding interview outcome that the team can re-run and analyze over time.

## In Scope

- End-to-end validation of the web onboarding path for a fresh owner
- Automated validation of the onboarding interview behavior and outcome, not only route-level completion
- A single supported fresh-user authentication path for v1
- Company bootstrap form completion
- Multi-turn onboarding interview completion through the web chat
- Verification that onboarding completion unlocks dashboard access
- A markdown briefing file that describes the test company and serves as the business context for the automated interview validation
- Validation of the interview result after the flow finishes so the team can review whether the interviewer asked appropriate questions and reached a coherent completion state
- A reusable scenario structure that can be run repeatedly as onboarding evolves
- Test assertions that confirm the assistant asks onboarding questions and accepts coherent answers until completion

## Out of Scope

- Supporting both sign-up and sign-in paths in v1
- Real third-party auth automation if a deterministic local or test auth mode exists
- WhatsApp transport validation
- Audio-input onboarding coverage unless the user flow explicitly requires it for onboarding completion
- Load, performance, or concurrency testing
- Testing every dashboard feature after onboarding; only access eligibility matters here
- Exhaustive prompt-quality evaluation of the Onboarding Agent beyond successful onboarding completion and interview-result validation

## Users

- New owner creating an account and setting up their first company
- Returning clean-room test user signing in to resume a just-created onboarding session
- Development team members who need a repeatable signal that the onboarding flow still works end to end

## User States

### Fresh unauthenticated user

- can enter through one supported fresh-user auth path using a clean test identity
- has no existing completed company
- should be routed into onboarding rather than dashboard

### Authenticated user with no company yet

- lands on the company bootstrap step
- can submit the minimal company creation form once

### Authenticated user with onboarding company

- proceeds into the onboarding chat
- answers assistant questions over multiple turns
- remains in onboarding until backend completion criteria are met

### Authenticated user with completed onboarding

- is redirected or granted access to the dashboard
- must no longer be blocked by onboarding guards

## End-to-End Flow

### Step 1: Authentication

Purpose:
- establish a fresh owner session suitable for onboarding

Expected behavior:
- the validation flow can create or use a clean owner identity through one supported fresh-user auth path
- after successful authentication, the product evaluates onboarding state
- a user without a completed company is routed into onboarding

### Step 2: Company Bootstrap

Purpose:
- create the initial company record required for onboarding

Expected behavior:
- the user fills the small bootstrap form with the minimum required company data
- form submission creates or reuses the onboarding company safely
- successful submission advances the flow to the onboarding chat

### Step 3: Onboarding Interview

Purpose:
- complete the conversational information-gathering flow driven by the Onboarding Agent

Expected behavior:
- the chat shows the assistant prompts in sequence
- the validation flow can read the assistant questions from the UI and answer them consistently
- answers remain coherent across the full interview and do not contradict prior answers
- the conversation continues until the backend marks onboarding complete
- the flow tolerates wording variation in assistant prompts as long as the underlying business intent is preserved
- when the interview finishes, the interviewer stops asking new onboarding questions and the user is redirected to the dashboard

### Interview Briefing

Purpose:
- provide a stable business context that guides the automated interview answers and later result review

Expected behavior:
- the validation flow is anchored to a markdown briefing for the test company
- the briefing includes the company description
- the briefing explains the company services
- the briefing describes what clients are typically looking for in chat
- the same briefing can be used when re-running the validation after future interviewer prompt changes

### Step 4: Dashboard Access

Purpose:
- confirm that successful onboarding unlocks the product entry point

Expected behavior:
- once onboarding completes, the user is redirected to or can navigate to the dashboard
- dashboard guards no longer send the user back to onboarding

## Business Rules

1. The end-to-end test must validate the real web onboarding journey, not a parallel fake onboarding path.
2. Backend onboarding state remains the source of truth for whether the user must continue onboarding or may access the dashboard.
3. The test user used for this flow must start from a clean enough state that prior company or onboarding data does not contaminate results.
4. Company bootstrap must happen before the onboarding chat begins.
5. The onboarding interview is considered successful only when the existing backend completion logic marks the company onboarding as complete.
6. The test must follow the assistant-led conversation and respond coherently across multiple turns, rather than sending arbitrary repeated filler responses.
7. The test should assert business milestones and routing outcomes, not fragile exact assistant phrasing.
8. Successful onboarding must result in dashboard eligibility for the same user and company created in the test.
9. The canonical user-visible completion signal is that the interviewer stops asking onboarding questions and the user is redirected to the dashboard.
10. The validation flow must be grounded in a documented test-company briefing so that interview answers remain tied to a known business context.
11. The team must be able to re-run the same flow after interviewer prompt changes and review the resulting interview outcome.

## Reliability Requirements

- The scenario must be repeatable in local development and CI-like environments with deterministic setup.
- The test flow must minimize dependence on volatile external systems when a project-supported deterministic substitute exists.
- The conversation-driving portion of the test must remain maintainable as onboarding questions evolve.
- The interview-validation portion must remain useful when interviewer prompts change, so the team can compare or inspect outcomes across reruns.
- The validation flow must preserve enough interview evidence or result visibility for the team to analyze whether the interviewer still asked appropriate questions and completed the process coherently.
- The test must fail with actionable signals that identify whether the break happened in auth, bootstrap, onboarding chat, completion detection, or dashboard routing.
- If no deterministic auth mechanism exists yet, that gap must be surfaced clearly because it blocks reliable validation.

## Edge Cases

### Existing stale test identity

- if the nominal test user already exists or has partial onboarding data, the scenario must recover through an explicit clean-user strategy rather than silently reusing polluted state

### Duplicate bootstrap submit

- the test should not pass if the company bootstrap step creates duplicate companies or becomes stuck on repeated submission

### Long onboarding conversation

- the interview may span many assistant messages and user replies; the test must support enough turns to reach completion without timing out prematurely under normal conditions

### Prompt wording drift

- the assistant may rephrase questions over time; the test must remain valid as long as it can identify the business intent of the prompt and answer appropriately

### Interview quality drift

- the flow may still technically complete while collecting worse or incomplete business context; the validation artifact must make that outcome reviewable by the team

### Resume instead of fresh start

- if a page refresh or route transition occurs during the scenario, the conversation must resume instead of restarting from the beginning

### Completion not reflected in routing

- the test must catch the case where the interview completes in chat but dashboard access remains blocked due to stale or inconsistent onboarding state

## Non-Functional Requirements

- The full onboarding validation should be simple for developers to run when working on onboarding changes.
- The test structure should support future extension with additional onboarding scenarios without rewriting the base flow.
- Assertions should emphasize user-visible outcomes and backend-driven completion state over implementation details.
- The validation flow should support repeated analysis of interview behavior after prompt or onboarding changes.
- The overall flow should complete within a reasonable E2E runtime for regular development use.

## Acceptance Criteria

1. The repository defines a reusable onboarding validation flow for a fresh owner user.
2. The scenario authenticates a clean user through one supported fresh-user application auth path.
3. After authentication, the user is routed to onboarding rather than directly to the dashboard when no completed company exists.
4. The scenario fills and submits the company bootstrap form successfully.
5. After bootstrap, the scenario reaches the onboarding chat step.
6. The scenario reads assistant prompts from the onboarding chat and sends coherent answers across the full interview.
7. The scenario can continue through a multi-turn interview until the backend marks onboarding complete.
8. The scenario does not depend on exact hard-coded assistant wording for every prompt.
9. The validation flow is anchored to a markdown briefing file for the test company that includes company description, company services, and what clients are typically looking for in chat.
10. When onboarding completes, the interviewer stops asking onboarding questions and the user is redirected to the company dashboard.
11. Attempting to access the dashboard after completion no longer redirects the user back to onboarding.
12. The resulting interview can be reviewed by the team after reruns to analyze whether prompt changes preserved a coherent, successful onboarding conversation.
13. A failure in auth, bootstrap, onboarding chat, interview completion, interview-result validation, or dashboard routing is surfaced clearly enough to diagnose which stage broke.

## Assumptions

1. A deterministic auth strategy may or may not already exist; the team may need to discover the current state and create one if necessary.
2. The onboarding flow exposes or can expose enough user-visible signals to determine when the interview is complete and the dashboard should unlock.
3. The onboarding interview can be completed with text answers only for this initial test scope unless product requirements explicitly demand audio.
4. The team accepts a single happy-path full-flow onboarding test as the first delivery slice, with more variants added later if needed.
5. A single canonical test-company briefing is sufficient for the first delivery slice.

## Risks

- If the auth story for tests is not deterministic, the E2E flow will become flaky before onboarding behavior is even exercised.
- If the onboarding agent’s questions are highly unstable or ambiguous, maintaining coherent automated answers will be expensive.
- If completion is only inferable through fragile UI text, the test may become brittle even when product behavior is correct.
- If the interview can complete without collecting good business context, the flow may pass superficially while still failing the intended validation purpose.
- If local and CI environments differ materially in onboarding dependencies, the test may pass in one place and fail in another.
