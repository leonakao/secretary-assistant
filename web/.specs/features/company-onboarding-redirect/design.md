# Company Onboarding Redirect

## Overview

The web app must stop assuming that any authenticated Auth0 session is dashboard-ready. After sign in or sign up, route decisions should be based on backend onboarding state:

- no related company -> `/onboarding`
- onboarding company -> `/onboarding`
- completed company -> `/dashboard`

The onboarding flow has two steps:

1. minimal company bootstrap form
2. onboarding chat using backend endpoints that reuse the existing Onboarding Agent behavior

The flow must be resume-safe and loop-safe.

## Existing Web Anchors

- `web/app/modules/auth/pages/login-page/index.tsx`
  - current login page redirects authenticated users to `/dashboard`
- `web/app/modules/dashboard/pages/dashboard-page/index.tsx`
  - current dashboard bootstrap calls `GET /users/me`
- `web/app/modules/auth/session.ts`
  - current session bootstrap wrapper around `GET /users/me`
- `web/app/lib/api.client.ts`
  - shared API client
- current auth loop-safety work already added for backend `401` mismatch

## Design Goals

1. Use loader-first route decisions from backend state.
2. Keep auth state and onboarding state distinct.
3. Prevent redirect loops between `/login`, `/dashboard`, and `/onboarding`.
4. Support refresh and resume for both onboarding steps.
5. Keep route modules thin and move backend mapping into feature APIs/use-cases.

## Frontend State Contract

The web app should consume the enriched authenticated user contract from the API:

```ts
interface SessionUser {
  id: string;
  authProviderId: string | null;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string;
    name: string;
    step: 'onboarding' | 'running';
    role: 'owner' | 'admin' | 'employee';
  } | null;
  onboarding: {
    requiresOnboarding: boolean;
    step: 'company-bootstrap' | 'assistant-chat' | 'complete';
  };
}
```

This should become the source for route decisions after auth bootstrap.

## Route Model

### `/login`

Behavior:
- unauthenticated: render sign-in/sign-up entry page
- authenticated + `requiresOnboarding = true`: redirect to `/onboarding`
- authenticated + `requiresOnboarding = false`: redirect to `/dashboard`

Loop prevention:
- if login is entered with the existing auth recovery flag caused by backend rejection, suppress automatic redirect until a fresh explicit sign-in occurs
- this existing loop-safe logic should stay in place and coexist with onboarding routing

### `/dashboard`

Behavior:
- unauthenticated: redirect to `/login`
- authenticated + `requiresOnboarding = true`: redirect to `/onboarding`
- authenticated + `requiresOnboarding = false`: render dashboard

### `/onboarding`

Behavior:
- unauthenticated: redirect to `/login`
- authenticated + `requiresOnboarding = false`: redirect to `/dashboard`
- authenticated + `requiresOnboarding = true`:
  - show bootstrap form when `onboarding.step = 'company-bootstrap'`
  - show chat when `onboarding.step = 'assistant-chat'`

## Loader-First Design

Recommended route structure:

- `app/routes/login.tsx`
- `app/routes/dashboard.tsx`
- `app/routes/onboarding.tsx`

Recommended module:

- `app/modules/onboarding/`
  - `api/`
  - `use-cases/`
  - `pages/onboarding-page/index.tsx`
  - `pages/onboarding-page/components/`

### Authenticated Route Resolution

The current app performs auth bootstrap inside page components. For this feature, route decisions should converge on a single loader-oriented session bootstrap/use-case that returns:

- auth readiness
- enriched backend session user
- onboarding requirement
- target route

Recommended use-case:

```ts
type AuthenticatedEntryTarget = '/dashboard' | '/onboarding';
```

The route layer can then:
- redirect to the correct route
- render the page only after loader data is known

If full loader migration is too large for this slice, keep current page-level bootstrap but ensure all redirects are based on the enriched backend session response instead of Auth0 session alone.

## Onboarding Page Design

### Page State

The onboarding page should render from `GET /onboarding/state`.

Recommended loader data:

```ts
interface OnboardingPageLoaderData {
  company: {
    id: string;
    name: string;
    step: 'onboarding' | 'running';
  } | null;
  onboarding: {
    requiresOnboarding: boolean;
    step: 'company-bootstrap' | 'assistant-chat' | 'complete';
  };
  conversation: {
    threadId: string | null;
    messages: Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      createdAt: string;
    }>;
  } | null;
}
```

Render logic:
- `company-bootstrap` -> render form
- `assistant-chat` -> render chat
- `complete` -> redirect to dashboard

### Step 1: Bootstrap Form

UI responsibilities:
- small, low-friction form
- clear explanation that the company profile is being created
- disabled submit while request is in flight
- server-driven validation errors

Submission:
- call `POST /onboarding/company`
- on success, either:
  - transition local state to step 2 from the response, or
  - reload onboarding state from the server

Preferred approach:
- re-fetch onboarding state after success to keep the server as the source of truth

### Step 2: Chat

UI responsibilities:
- simple conversation transcript
- input composer and send action
- optimistic input lock while waiting for reply
- resume transcript on refresh

Submission:
- call `POST /onboarding/messages`
- append user and assistant messages from server response
- if response says onboarding is complete, redirect to `/dashboard`

Preferred model:
- no local-only conversation authority
- after each send, normalize view state from the response payload

## API Wrappers / Use-Cases

Recommended `app/modules/onboarding/api/` functions:

- `getOnboardingState()`
- `createOnboardingCompany(input)`
- `sendOnboardingMessage(input)`

Recommended `app/modules/onboarding/use-cases/`:

- `loadOnboardingPageData()`
- `resolveAuthenticatedEntryTarget(sessionUser)`

Recommended `app/modules/auth/` changes:

- extend `SessionUser` typing in `get-current-user.ts`
- update `bootstrapAuthSession()` consumers to use onboarding-aware routing decisions

## Redirect-Loop Prevention

This feature introduces a second redirect axis beyond auth mismatch:
- authenticated but not dashboard-ready

Rules:
1. `/login` must not auto-redirect solely on `isAuthenticated`; it must wait for backend session bootstrap.
2. `/login` must redirect to `/onboarding` when backend says onboarding is required.
3. `/dashboard` must redirect incomplete users to `/onboarding`.
4. `/onboarding` must redirect completed users to `/dashboard`.
5. The existing recovery flag for backend `401` should continue to suppress automatic redirect on `/login` until a deliberate retry.

This ensures:
- no `/login` <-> `/dashboard` loops
- no `/dashboard` <-> `/onboarding` loops

## Component Boundaries

Recommended page-private components:

- `company-bootstrap-form.tsx`
- `onboarding-chat.tsx`
- `onboarding-progress-header.tsx`

Recommended shared design choices:

- keep onboarding visuals distinct from the dashboard shell
- keep styling localized to onboarding components
- avoid putting API orchestration directly into JSX-heavy components

## Validation and Error Handling

### Bootstrap Form Errors

- field validation errors shown inline or at form level
- duplicate onboarding company should resolve into resume behavior, not a blocking fatal state

### Chat Errors

- show retryable error state for failed message send
- do not discard the typed input until the user chooses to retry or edit

### Auth / Session Errors

- unauthenticated -> login
- backend `401` with existing Auth0 session -> existing recovery flow
- onboarding-required state is not an error; it is a normal route outcome

## Testing Strategy

### Unit Tests

- onboarding route decision from session user:
  - no company -> `/onboarding`
  - onboarding company -> `/onboarding`
  - running company -> `/dashboard`
- login redirect suppression when recovery flag is present
- onboarding loader mapping

### Component Tests

- bootstrap form submission success and validation errors
- chat render from existing messages
- chat completion redirect

### E2E Tests

- sign up -> onboarding form -> onboarding chat
- sign in with incomplete onboarding -> onboarding resume
- sign in with completed onboarding -> dashboard
- dashboard visit while incomplete -> onboarding redirect
- refresh during onboarding chat -> transcript resumes
- backend auth mismatch does not cause redirect loop

## Execution Slices

### Slice 1: Session Contract Adoption

- extend `SessionUser` types
- update login/dashboard routing logic to use backend onboarding state

### Slice 2: Onboarding Route

- add `/onboarding`
- add loader/use-case to resolve bootstrap vs chat vs dashboard redirect

### Slice 3: Bootstrap Form

- implement onboarding company form and submit flow

### Slice 4: Chat UI

- implement transcript and send flow
- handle completion redirect

### Slice 5: Hardening

- refresh/resume
- error states
- end-to-end route coverage

## Risks and Mitigations

### Routing logic is split across pages

Risk:
- inconsistent decisions between login, dashboard, and onboarding

Mitigation:
- centralize route decision logic in auth/onboarding use-cases

### Page-level auth bootstrap causes flicker or race conditions

Risk:
- temporary rendering of wrong screens before redirect

Mitigation:
- prefer loader-first routing where practical; otherwise hold a neutral loading state until backend session resolution finishes

### Chat UI drifts from backend conversation truth

Risk:
- stale transcript or wrong completion state

Mitigation:
- treat server responses as authoritative after each action
