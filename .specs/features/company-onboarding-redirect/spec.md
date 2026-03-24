# Company Onboarding Redirect

## Summary

When an authenticated user signs in or signs up, the product must route them based on whether they are already related to a company.

- Users with a completed company setup should continue to the dashboard.
- Users with no related company should be redirected to a dedicated onboarding flow.
- Users with a related company that is still onboarding should resume onboarding instead of entering the dashboard.

The onboarding flow starts with a small bootstrap form to create the company in onboarding mode, then continues in a chat experience backed by the existing Onboarding Agent behavior already used through WhatsApp.

## Problem

Today the authenticated entry flow assumes the user can enter the dashboard after login. That breaks for first-time owners who do not yet have a company attached to their account and have not completed the business setup required for the product to function.

Without an onboarding redirect:

- first-time owners land in a dashboard that is not actionable yet
- the product has no guided path to create the initial company
- the existing onboarding intelligence in the API is not available from the web app
- refresh and partial-progress scenarios are unclear

## Goal

Provide a deterministic authenticated routing flow that sends incomplete owners into onboarding and completed owners into the dashboard, while reusing the existing onboarding agent domain behavior.

## In Scope

- Post-auth routing based on backend onboarding state
- A protected `/onboarding` flow for incomplete owners
- Step 1 bootstrap form to create a company in onboarding mode
- Step 2 onboarding chat using the existing Onboarding Agent behavior
- Resume behavior after refresh or returning later
- Dashboard guard for incomplete owners
- Loop-safe auth behavior when Auth0 session and backend state disagree

## Out of Scope

- Multi-company management UX
- Advanced onboarding wizard branching
- Redesign of WhatsApp onboarding behavior
- Billing or subscription steps
- Full dashboard setup beyond what is needed to unlock onboarding completion

## Users

- New owner who just signed up and has no company yet
- Existing owner who signed in but left onboarding unfinished
- Existing owner with a completed company setup

## User States

### Unauthenticated

- Visiting `/dashboard` redirects to `/login`
- Visiting `/onboarding` redirects to `/login`

### Authenticated + no company relation

- `/login` redirects to `/onboarding`
- `/dashboard` redirects to `/onboarding`
- `/onboarding` opens at step 1

### Authenticated + onboarding company

- `/login` redirects to `/onboarding`
- `/dashboard` redirects to `/onboarding`
- `/onboarding` resumes the correct step

### Authenticated + completed company

- `/login` redirects to `/dashboard`
- `/onboarding` redirects to `/dashboard`
- `/dashboard` opens normally

## Onboarding Flow

### Step 1: Company Bootstrap

Purpose:
- Create the initial company record
- Attach the current user to it
- Mark the company as onboarding

Minimum input:
- company name
- business category or type
- owner display name only if still missing from the authenticated profile
- optional phone if helpful for later flows

Expected behavior:
- submit creates the company in onboarding mode
- submit is safe against refresh/double-submit duplication
- successful submit advances the user to the chat step

### Step 2: Onboarding Chat

Purpose:
- Collect company context through a conversational flow
- Reuse the existing onboarding assistant logic already used in WhatsApp
- Persist progress so onboarding can be resumed

Expected behavior:
- the user sees prior onboarding messages on reload
- new messages continue the same onboarding thread
- when onboarding is complete, the company becomes dashboard-eligible
- the user is redirected to `/dashboard` after completion

## Business Rules

1. Backend state is the source of truth for onboarding routing.
2. A user is considered dashboard-ready only when they are related to a company whose onboarding is complete.
3. A user can have at most one active onboarding company for this flow.
4. Onboarding completion is determined by backend domain logic, not by the frontend alone.
5. The web onboarding chat must preserve the existing Onboarding Agent behavior rather than introducing a parallel onboarding script.
6. Refreshing or revisiting onboarding must resume state instead of restarting from scratch.

## Edge Cases

### Auth0 session exists but backend denies dashboard access

The product must not bounce indefinitely between `/login` and `/dashboard`. In this state:

- automatic redirect from login to dashboard must be paused
- the user should be kept in a recoverable onboarding/login state
- retry should happen only from a deliberate user action or a confirmed backend-ready state

### Duplicate bootstrap submit

- repeated submission must not create duplicate onboarding companies

### Partial onboarding

- if the user finishes step 1 but not step 2, they must return to step 2 on the next visit

### Completed onboarding

- completed users must stop seeing onboarding and go to the dashboard

## Acceptance Criteria

1. A newly authenticated user without a company is redirected to `/onboarding`.
2. An authenticated user with a company still onboarding is redirected to `/onboarding`.
3. An authenticated user with completed onboarding is redirected to `/dashboard`.
4. Step 1 creates a company in onboarding mode and attaches the user to it.
5. Step 2 resumes the same onboarding conversation after refresh.
6. Completing onboarding unlocks dashboard access and redirects to `/dashboard`.
7. Visiting `/dashboard` before onboarding completion redirects to `/onboarding`.
8. The login and dashboard flow does not enter an automatic redirect loop when backend state is not yet dashboard-ready.

## Open Decisions To Confirm

1. The exact minimum bootstrap fields for step 1.
2. The canonical definition of "related to a company" for authenticated routing.
3. Whether onboarding completion should map to the existing `company.step = running` model directly or to a more explicit onboarding status contract exposed to the web app.
