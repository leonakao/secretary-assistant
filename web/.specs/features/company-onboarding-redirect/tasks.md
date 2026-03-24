# Company Onboarding Redirect – Web Tasks

**Design**: `.specs/features/company-onboarding-redirect/design.md`
**Status**: Draft

---

## Execution Plan

```
Phase 1 (Sequential – Session Contract):
  T1 → T2 → T3

Phase 2 (Sequential – Onboarding Module Foundation):
  T3 → T4 → T5

Phase 3 (Parallel – Onboarding API + Use-Cases):
  T5 ──┬── T6 [P]
       └── T7 [P]

Phase 4 (Sequential – Onboarding Page + Steps):
  T6, T7 → T8 → T9 → T10

Phase 5 (Sequential – Route Wiring + Loop Safety):
  T10 → T11 → T12

Phase 6 (Sequential – Tests + Hardening):
  T12 → T13 → T14
```

---

## Task Breakdown

### T1: Extend `SessionUser` type in `get-current-user.ts`

**What**: Add `company` and `onboarding` fields to the `SessionUser` interface to match the enriched API contract.
**Where**: `web/app/modules/auth/api/get-current-user.ts`
**Depends on**: None

**Done when**:
- [ ] `SessionUser` includes `company: { id, name, step, role } | null`
- [ ] `SessionUser` includes `onboarding: { requiresOnboarding: boolean; step: 'company-bootstrap' | 'assistant-chat' | 'complete' }`
- [ ] No TypeScript errors: `npx tsc --noEmit`

---

### T2: Add `resolveAuthenticatedEntryTarget` use-case

**What**: Pure function that maps a `SessionUser` to the correct route target.
**Where**: `web/app/modules/auth/use-cases/resolve-authenticated-entry-target.ts` (new)
**Depends on**: T1

```ts
type AuthenticatedEntryTarget = '/dashboard' | '/onboarding';
function resolveAuthenticatedEntryTarget(user: SessionUser): AuthenticatedEntryTarget
```

**Done when**:
- [ ] Returns `'/onboarding'` when `onboarding.requiresOnboarding = true`
- [ ] Returns `'/dashboard'` when `onboarding.requiresOnboarding = false`
- [ ] Unit tests cover both cases
- [ ] No TypeScript errors

**Verify**:
```bash
npx tsc --noEmit
pnpm test
```

---

### T3: Update `LoginPage` redirect to use backend onboarding state

**What**: Replace the current `isAuthenticated`-only redirect in `LoginPage` with a backend-session-aware redirect that calls `bootstrapAuthSession` and uses `resolveAuthenticatedEntryTarget`.
**Where**: `web/app/modules/auth/pages/login-page/index.tsx`
**Depends on**: T1, T2
**Reuses**: existing `bootstrapAuthSession`, `isUnauthorizedSessionRecovery`

**Done when**:
- [ ] Auto-redirect is suppressed when `isUnauthorizedRecovery` is true (existing behavior unchanged)
- [ ] Auto-redirect calls `bootstrapAuthSession`, then routes to `/onboarding` or `/dashboard` based on `resolveAuthenticatedEntryTarget`
- [ ] Loading state holds while backend session is resolving
- [ ] No TypeScript errors

**Verify**:
```bash
npx tsc --noEmit
```

---

### T4: Create `onboarding` module scaffold

**What**: Create the `app/modules/onboarding/` directory structure with empty index files.
**Where**: `web/app/modules/onboarding/api/`, `web/app/modules/onboarding/use-cases/`, `web/app/modules/onboarding/pages/onboarding-page/components/`
**Depends on**: T3

**Done when**:
- [ ] Directory structure matches design recommendation
- [ ] No TypeScript errors from empty barrel files

---

### T5: Add `onboarding` API wrapper functions

**What**: Create the three API wrapper functions for the onboarding endpoints.
**Where**: `web/app/modules/onboarding/api/onboarding.api.ts` (new)
**Depends on**: T4
**Reuses**: `fetchApi` from `~/lib/api.client`

**Functions**:
- `getOnboardingState(): Promise<OnboardingStateResponse>`
- `createOnboardingCompany(input: CreateOnboardingCompanyInput): Promise<CreateOnboardingCompanyResponse>`
- `sendOnboardingMessage(input: { message: string }): Promise<SendOnboardingMessageResponse>`

**Done when**:
- [ ] All three functions call the correct endpoints (`GET /onboarding/state`, `POST /onboarding/company`, `POST /onboarding/messages`)
- [ ] Response types match the design contract
- [ ] No TypeScript errors

---

### T6: Add `loadOnboardingPageData` use-case [P]

**What**: Use-case function that calls `getOnboardingState` and returns typed loader data for the onboarding page.
**Where**: `web/app/modules/onboarding/use-cases/load-onboarding-page-data.ts` (new)
**Depends on**: T5

**Done when**:
- [ ] Returns `OnboardingPageLoaderData` shape from design
- [ ] Re-exports the type for route loader use
- [ ] No TypeScript errors

---

### T7: Add `resolveOnboardingStep` use-case [P]

**What**: Pure function that maps `OnboardingPageLoaderData` to the current UI step (`'company-bootstrap' | 'assistant-chat' | 'complete'`).
**Where**: `web/app/modules/onboarding/use-cases/resolve-onboarding-step.ts` (new)
**Depends on**: T5

**Done when**:
- [ ] Returns `'company-bootstrap'` when `onboarding.step = 'company-bootstrap'`
- [ ] Returns `'assistant-chat'` when `onboarding.step = 'assistant-chat'`
- [ ] Returns `'complete'` when `onboarding.step = 'complete'`
- [ ] Unit tests cover all three cases
- [ ] No TypeScript errors

**Verify**:
```bash
pnpm test --testPathPattern=resolve-onboarding-step
```

---

### T8: Create `CompanyBootstrapForm` component

**What**: Form component for Step 1 of onboarding that collects company name and business type.
**Where**: `web/app/modules/onboarding/pages/onboarding-page/components/company-bootstrap-form.tsx` (new)
**Depends on**: T6, T7

**Props**:
- `onSuccess: () => void` (triggers state reload)

**Done when**:
- [ ] Renders `name` and `businessType` fields
- [ ] Submit button disabled while request is in flight
- [ ] Calls `createOnboardingCompany` on submit
- [ ] Displays server validation errors inline
- [ ] On success calls `onSuccess` to re-fetch onboarding state
- [ ] No TypeScript errors

---

### T9: Create `OnboardingChat` component

**What**: Chat UI component for Step 2 that renders existing messages and allows sending new ones.
**Where**: `web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat.tsx` (new)
**Depends on**: T6, T7

**Props**:
- `conversation: { threadId: string | null; messages: Message[] }`
- `onComplete: () => void` (triggers redirect to `/dashboard`)

**Done when**:
- [ ] Renders existing transcript ordered chronologically
- [ ] Input is locked while send is in flight (optimistic lock)
- [ ] Calls `sendOnboardingMessage` on send
- [ ] Appends assistant message from response
- [ ] Calls `onComplete` when response `onboarding.step = 'complete'`
- [ ] Shows retryable error without discarding typed input on failure
- [ ] No TypeScript errors

---

### T10: Create `OnboardingPage` component

**What**: Page component that loads onboarding state and renders the correct step.
**Where**: `web/app/modules/onboarding/pages/onboarding-page/index.tsx` (new)
**Depends on**: T8, T9

**Done when**:
- [ ] Calls `loadOnboardingPageData` on mount
- [ ] Shows loading state during data fetch
- [ ] Renders `CompanyBootstrapForm` when step is `'company-bootstrap'`
- [ ] Renders `OnboardingChat` when step is `'assistant-chat'`
- [ ] Redirects to `/dashboard` when step is `'complete'`
- [ ] Refreshes state after bootstrap form success
- [ ] No TypeScript errors

---

### T11: Add `/onboarding` route with guard logic

**What**: Create the onboarding route file with redirect guards for unauthenticated and completed users.
**Where**: `web/app/routes/onboarding.tsx` (new)
**Depends on**: T10

**Done when**:
- [ ] Unauthenticated → redirect to `/login`
- [ ] Authenticated + `requiresOnboarding = false` → redirect to `/dashboard`
- [ ] Authenticated + `requiresOnboarding = true` → renders `OnboardingPage`
- [ ] No TypeScript errors

---

### T12: Update `DashboardPage` to guard incomplete users

**What**: Add a backend-session check in `DashboardPage` that redirects to `/onboarding` when `requiresOnboarding = true`.
**Where**: `web/app/modules/dashboard/pages/dashboard-page/index.tsx`
**Depends on**: T11
**Reuses**: extended `SessionUser` from T1, `resolveAuthenticatedEntryTarget` from T2

**Done when**:
- [ ] After `bootstrapAuthSession` resolves, checks `onboarding.requiresOnboarding`
- [ ] Redirects to `/onboarding` when `requiresOnboarding = true`
- [ ] Existing 401 recovery flow is unchanged
- [ ] No TypeScript errors

---

### T13: Unit and component tests

**What**: Add unit tests for use-cases and component tests for form and chat.
**Where**: co-located test files next to each source file
**Depends on**: T12

**Done when**:
- [ ] `resolveAuthenticatedEntryTarget` — both routing outcomes
- [ ] `resolveOnboardingStep` — all three steps
- [ ] `CompanyBootstrapForm` — submit success, validation error render
- [ ] `OnboardingChat` — renders existing messages, calls `onComplete` on completion response
- [ ] Login redirect suppression when recovery flag is present (regression)
- [ ] All tests pass: `pnpm test`

**Verify**:
```bash
pnpm test
npx tsc --noEmit
pnpm lint
```

---

### T14: End-to-end route coverage verification

**What**: Verify the full onboarding routing flow manually or via E2E tests.
**Where**: no new source files; verify against running app
**Depends on**: T13

**Scenarios**:
- [ ] Sign up → lands on `/onboarding` → company form → chat → `/dashboard`
- [ ] Sign in with incomplete onboarding → `/onboarding` resumes at correct step
- [ ] Sign in with completed onboarding → `/dashboard` directly
- [ ] Visit `/dashboard` while incomplete → redirected to `/onboarding`
- [ ] Refresh during onboarding chat → transcript resumes from server
- [ ] Backend auth mismatch does not cause redirect loop (existing recovery flag still works)

**Verify**:
```bash
pnpm dev  # with backend running: docker compose up -d
```
