# Company Onboarding Redirect – API Tasks

**Design**: `.specs/features/company-onboarding-redirect/design.md`
**Status**: Draft

---

## Execution Plan

```
Phase 1 (Sequential – Routing Contract):
  T1 → T2 → T3

Phase 2 (Sequential – Bootstrap Endpoint):
  T3 → T4 → T5

Phase 3 (Sequential – Shared Conversation Service):
  T5 → T6 → T7

Phase 4 (Parallel – Web Endpoints):
  T7 ──┬── T8 [P]
       └── T9 [P]

Phase 5 (Sequential – Tests):
  T8, T9 → T10 → T11
```

---

## Task Breakdown

### T1: Extend `SessionUser` DTO in `users/me` controller

**What**: Add `company` and `onboarding` fields to the response DTO used by `GET /users/me`.
**Where**: `api/src/modules/users/controllers/users-me.controller.ts` and the response class/dto file it uses
**Depends on**: None

**Done when**:
- [ ] DTO declares `company: { id, name, step, role } | null`
- [ ] DTO declares `onboarding: { requiresOnboarding, step }`
- [ ] No TypeScript errors: `npx tsc --noEmit`

---

### T2: Implement onboarding state mapping function

**What**: Pure function that maps `(user, userCompanyRelation | null)` to the `onboarding` and `company` contract shape.
**Where**: `api/src/modules/onboarding/utils/map-onboarding-state.ts` (new file)
**Depends on**: T1

**Done when**:
- [ ] No company relation → `company: null`, `requiresOnboarding: true`, `step: 'company-bootstrap'`
- [ ] Onboarding company → `company` populated, `requiresOnboarding: true`, `step: 'assistant-chat'`
- [ ] Running company → `company` populated, `requiresOnboarding: false`, `step: 'complete'`
- [ ] Unit tests cover all three states
- [ ] No TypeScript errors

**Verify**:
```bash
pnpm test --testPathPattern=map-onboarding-state
```

---

### T3: Wire onboarding state mapping into `GET /users/me`

**What**: Update the `users/me` controller handler to call the mapping function and return the enriched response.
**Where**: `api/src/modules/users/controllers/users-me.controller.ts`
**Depends on**: T1, T2
**Reuses**: existing `UserCompanyRepository` or company relation query pattern

**Done when**:
- [ ] `GET /users/me` includes `company` and `onboarding` for all three user states
- [ ] Existing user fields are unchanged
- [ ] Integration test covers no-company, onboarding, and running states
- [ ] No TypeScript errors

**Verify**:
```bash
pnpm test --testPathPattern=users-me
```

---

### T4: Create `OnboardingModule` scaffold

**What**: Create `api/src/modules/onboarding/` module with NestJS module file, controller stub, and service stub.
**Where**: `api/src/modules/onboarding/onboarding.module.ts` (new)
**Depends on**: T3

**Done when**:
- [ ] Module registers in `AppModule`
- [ ] Controller and service are importable with no errors
- [ ] No TypeScript errors

---

### T5: Implement `POST /onboarding/company` endpoint

**What**: Create the bootstrap endpoint that creates a company in `onboarding` step, attaches the user, and returns the onboarding contract.
**Where**: `api/src/modules/onboarding/controllers/onboarding-company.controller.ts` (new)
**Depends on**: T4
**Reuses**: existing `Company` entity, existing `UserCompany` relation, `map-onboarding-state` from T2

**Done when**:
- [ ] Validates `name` and `businessType` required
- [ ] Creates company with `step: 'onboarding'` and attaches user via `user_companies`
- [ ] Idempotent: if user already has an onboarding company, returns it without creating a duplicate
- [ ] Returns `CreateOnboardingCompanyResponse` shape from design
- [ ] Integration tests: creation success, idempotency, validation error
- [ ] No TypeScript errors

**Verify**:
```bash
pnpm test --testPathPattern=onboarding-company
```

---

### T6: Extract transport-neutral `OnboardingConversationService`

**What**: Extract a shared application service that runs the onboarding agent without WhatsApp-specific side effects.
**Where**: `api/src/modules/onboarding/services/onboarding-conversation.service.ts` (new)
**Depends on**: T5
**Reuses**: `OnboardingAssistantAgent`, `FinishOnboardingTool`, existing memory/thread pattern

**Input shape**:
```ts
{ userId: string; companyId: string; message: string; channel: 'whatsapp' | 'web' }
```

**Done when**:
- [ ] Loads user + company context by IDs
- [ ] Appends user message to thread memory
- [ ] Executes `OnboardingAssistantAgent`
- [ ] Persists assistant response
- [ ] Returns `{ assistantMessage, onboardingState }` with updated step
- [ ] Thread key is `onboarding:${companyId}:${userId}`
- [ ] Unit test covers normal reply and completion transition
- [ ] No TypeScript errors

**Verify**:
```bash
pnpm test --testPathPattern=onboarding-conversation.service
```

---

### T7: Adapt `OnboardingConversationStrategy` to use new service

**What**: Refactor the WhatsApp onboarding strategy to delegate core logic to `OnboardingConversationService`.
**Where**: `api/src/modules/chat/strategies/onboarding-conversation.strategy.ts`
**Depends on**: T6

**Done when**:
- [ ] WhatsApp presence, send, and `remoteJid` side effects are still performed by the strategy
- [ ] Core onboarding execution is delegated to `OnboardingConversationService`
- [ ] Existing WhatsApp integration tests still pass
- [ ] No TypeScript errors

**Verify**:
```bash
pnpm test --testPathPattern=onboarding-conversation.strategy
```

---

### T8: Implement `GET /onboarding/state` endpoint [P]

**What**: Create the state endpoint that returns current onboarding step and existing conversation messages.
**Where**: `api/src/modules/onboarding/controllers/onboarding-state.controller.ts` (new)
**Depends on**: T7
**Reuses**: `map-onboarding-state` from T2, thread memory read pattern

**Done when**:
- [ ] Returns `OnboardingStateResponse` shape from design
- [ ] `conversation.messages` are ordered by `createdAt` ascending
- [ ] If no company → `conversation: null`
- [ ] If company is running → `onboarding.step: 'complete'`
- [ ] Integration test covers all three states
- [ ] No TypeScript errors

**Verify**:
```bash
pnpm test --testPathPattern=onboarding-state
```

---

### T9: Implement `POST /onboarding/messages` endpoint [P]

**What**: Create the chat send endpoint that delegates to `OnboardingConversationService` and returns the assistant reply with updated onboarding state.
**Where**: `api/src/modules/onboarding/controllers/onboarding-messages.controller.ts` (new)
**Depends on**: T7

**Done when**:
- [ ] Validates `message` required
- [ ] Rejects send when user has no onboarding company (404)
- [ ] Rejects send when company is already `running` (409)
- [ ] Returns `SendOnboardingMessageResponse` shape from design
- [ ] Returns `step: 'complete'` and `requiresOnboarding: false` on completion
- [ ] Integration tests: normal reply, completion, no-company guard, already-running guard
- [ ] No TypeScript errors

**Verify**:
```bash
pnpm test --testPathPattern=onboarding-messages
```

---

### T10: WhatsApp regression test

**What**: Verify the WhatsApp onboarding path still completes correctly after the service extraction.
**Where**: existing WhatsApp integration test file
**Depends on**: T7, T8, T9

**Done when**:
- [ ] WhatsApp onboarding conversation still triggers `FinishOnboardingTool`
- [ ] Company transitions from `onboarding` to `running` after completion
- [ ] Company description and support flags are updated as before
- [ ] No regressions in existing tests

**Verify**:
```bash
pnpm test
```

---

### T11: Full integration test suite for onboarding endpoints

**What**: Add integration tests covering all onboarding endpoint states and edge cases.
**Where**: `api/src/modules/onboarding/__tests__/` (new)
**Depends on**: T8, T9, T10

**Done when**:
- [ ] `GET /users/me` — no company, onboarding, running
- [ ] `POST /onboarding/company` — creation, idempotency, validation
- [ ] `GET /onboarding/state` — no company, onboarding with messages, running
- [ ] `POST /onboarding/messages` — reply, completion, guards
- [ ] Resume: `GET /onboarding/state` after prior messages returns full transcript
- [ ] All tests pass: `pnpm test`
- [ ] No TypeScript errors: `npx tsc --noEmit`

**Verify**:
```bash
pnpm test
npx tsc --noEmit
pnpm lint
```
