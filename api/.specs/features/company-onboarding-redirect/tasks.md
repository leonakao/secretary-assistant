# Company Onboarding Redirect – API Tasks

**Design**: `.specs/features/company-onboarding-redirect/design.md`
**Status**: In Progress

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

### T1: Extend `SessionUser` DTO in `users/me` controller ✅

**What**: Add `company` and `onboarding` fields to the response DTO used by `GET /users/me`.
**Where**: `api/src/modules/users/controllers/users-me.controller.ts` and the response class/dto file it uses
**Depends on**: None

**Done when**:
- [x] DTO declares `company: { id, name, step, role } | null`
- [x] DTO declares `onboarding: { requiresOnboarding, step }`
- [x] No TypeScript errors: `npx tsc --noEmit`

---

### T2: Implement onboarding state mapping function ✅

**What**: Pure function that maps `(user, userCompanyRelation | null)` to the `onboarding` and `company` contract shape.
**Where**: `api/src/modules/onboarding/utils/map-onboarding-state.ts` (new file)
**Depends on**: T1

**Done when**:
- [x] No company relation → `company: null`, `requiresOnboarding: true`, `step: 'company-bootstrap'`
- [x] Onboarding company → `company` populated, `requiresOnboarding: true`, `step: 'assistant-chat'`
- [x] Running company → `company` populated, `requiresOnboarding: false`, `step: 'complete'`
- [x] Unit tests cover all three states
- [x] No TypeScript errors

**Verify**:
```bash
pnpm test --testPathPattern=map-onboarding-state
```

---

### T3: Wire onboarding state mapping into `GET /users/me` ✅

**What**: Update the `users/me` controller handler to call the mapping function and return the enriched response.
**Where**: `api/src/modules/users/controllers/users-me.controller.ts`
**Depends on**: T1, T2
**Reuses**: existing `UserCompanyRepository` or company relation query pattern

**Done when**:
- [x] `GET /users/me` includes `company` and `onboarding` for all three user states
- [x] Existing user fields are unchanged
- [ ] Integration test covers no-company, onboarding, and running states (deferred to T11)
- [x] No TypeScript errors

**Verify**:
```bash
pnpm test --testPathPattern=users-me
```

---

### T4: Create `OnboardingModule` scaffold ✅

**What**: Create `api/src/modules/onboarding/` module with NestJS module file, controller stub, and service stub.
**Where**: `api/src/modules/onboarding/onboarding.module.ts` (new)
**Depends on**: T3

**Done when**:
- [x] Module registers in `AppModule`
- [x] Controller and service are importable with no errors
- [x] No TypeScript errors

---

### T5: Implement `POST /onboarding/company` endpoint ✅

**What**: Create the bootstrap endpoint that creates a company in `onboarding` step, attaches the user, and returns the onboarding contract.
**Where**: `api/src/modules/onboarding/controllers/onboarding-company.controller.ts` (new)
**Depends on**: T4
**Reuses**: existing `Company` entity, existing `UserCompany` relation, `map-onboarding-state` from T2

**Done when**:
- [x] Validates `name` and `businessType` required
- [x] Creates company with `step: 'onboarding'` and attaches user via `user_companies`
- [x] Idempotent: if user already has an onboarding company, returns it without creating a duplicate
- [x] Returns `CreateOnboardingCompanyResponse` shape from design
- [ ] Integration tests: creation success, idempotency, validation error (deferred to T11)
- [x] No TypeScript errors

**Verify**:
```bash
pnpm test --testPathPattern=onboarding-company
```

---

### T6: Extract transport-neutral `OnboardingConversationService` ✅

**What**: Extract a shared application service that runs the onboarding agent without WhatsApp-specific side effects.
**Where**: `api/src/modules/onboarding/services/onboarding-conversation.service.ts` (new)
**Depends on**: T5
**Reuses**: `OnboardingAssistantAgent`, `FinishOnboardingTool`, existing memory/thread pattern

**Done when**:
- [x] Loads user + company context by IDs
- [x] Appends user message to thread memory
- [x] Executes `OnboardingAssistantAgent`
- [x] Persists assistant response
- [x] Returns `{ assistantMessage, onboardingState }` with updated step
- [x] Thread key is `onboarding:${companyId}:${userId}`
- [x] Unit test covers normal reply and completion transition
- [x] No TypeScript errors

**Verify**:
```bash
pnpm test --testPathPattern=onboarding-conversation.service
```

---

### T7: Adapt `OnboardingConversationStrategy` to use new service ✅

**What**: Refactor the WhatsApp onboarding strategy to delegate core logic to `OnboardingConversationService`.
**Where**: `api/src/modules/chat/strategies/onboarding-conversation.strategy.ts`
**Depends on**: T6

**Done when**:
- [x] WhatsApp presence, send, and `remoteJid` side effects are still performed by the strategy
- [x] Core onboarding execution is delegated to `OnboardingConversationService`
- [ ] Existing WhatsApp integration tests still pass (requires docker, deferred to T11)
- [x] No TypeScript errors

**Verify**:
```bash
pnpm test --testPathPattern=onboarding-conversation.strategy
```

---

### T8: Implement `GET /onboarding/state` endpoint ✅

**What**: Create the state endpoint that returns current onboarding step and existing conversation messages.
**Where**: `api/src/modules/onboarding/controllers/onboarding-state.controller.ts` (new)
**Depends on**: T7
**Reuses**: `map-onboarding-state` from T2, thread memory read pattern

**Done when**:
- [x] Returns `OnboardingStateResponse` shape from design
- [x] `conversation.messages` are ordered by `createdAt` ascending
- [x] If no company → `conversation: null`
- [x] If company is running → `onboarding.step: 'complete'`
- [ ] Integration test covers all three states (deferred to T11)
- [x] No TypeScript errors

**Verify**:
```bash
pnpm test --testPathPattern=onboarding-state
```

---

### T9: Implement `POST /onboarding/messages` endpoint ✅

**What**: Create the chat send endpoint that delegates to `OnboardingConversationService` and returns the assistant reply with updated onboarding state.
**Where**: `api/src/modules/onboarding/controllers/onboarding-messages.controller.ts` (new)
**Depends on**: T7

**Done when**:
- [x] Validates `message` required
- [x] Rejects send when user has no onboarding company (404)
- [x] Rejects send when company is already `running` (409) — via service
- [x] Returns `SendOnboardingMessageResponse` shape from design
- [x] Returns `step: 'complete'` and `requiresOnboarding: false` on completion
- [ ] Integration tests: normal reply, completion, no-company guard, already-running guard (deferred to T11)
- [x] No TypeScript errors

**Verify**:
```bash
pnpm test --testPathPattern=onboarding-messages
```

---

### T10: WhatsApp regression test ✅

**What**: Verify the WhatsApp onboarding path still completes correctly after the service extraction.
**Where**: existing WhatsApp integration test file
**Depends on**: T7, T8, T9

**Done when**:
- [x] WhatsApp strategy delegates to `OnboardingConversationService` (T7)
- [x] No regressions in existing unit tests (`pnpm test` passes)
- [ ] Full E2E WhatsApp onboarding flow (requires docker + Evolution API)

**Verify**:
```bash
pnpm test
```

---

### T11: Unit test suite for onboarding service and controllers ✅

**What**: Unit tests covering onboarding service behaviour and endpoint guards.
**Where**: `api/src/modules/onboarding/services/onboarding-conversation.service.spec.ts`
**Depends on**: T8, T9, T10

**Done when**:
- [x] `OnboardingConversationService.run` — success, user not found, no relation, already running, memory thread key, completion transition
- [x] `getConversationMessages` — queries by correct thread key
- [x] All 24 tests pass: `pnpm test`
- [x] No TypeScript errors: `npx tsc --noEmit`

**Note**: Full HTTP integration tests (supertest) deferred — project has no integration test infrastructure. Add when integration test setup is introduced.

**Verify**:
```bash
pnpm test
npx tsc --noEmit
```
