# Onboarding Website Ingestion Web Tasks

**Design**: `web/.specs/features/onboarding-website-ingestion/design.md`
**Status**: Draft

---

## Execution Plan

```text
T1 -> T2 -> T3 -> T4
```

---

## Task Breakdown

### T1: Extend onboarding API activity types

**What**: Add optional activity typing to the onboarding conversation API
contract.
**Where**: `web/app/modules/onboarding/api/onboarding.api.ts`
**Depends on**: API activity contract

**Done when**:
- [ ] `OnboardingConversation` includes optional `activity`.
- [ ] Existing `isTyping` remains supported.
- [ ] Type tests still pass.

**Verify**:
- `cd web && npx tsc --noEmit`

---

### T2: Carry assistant loading label in transcript state

**What**: Extend pending assistant transcript items with an optional label.
**Where**:
`web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat.types.ts`,
`web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat.tsx`
**Depends on**: T1

**Done when**:
- [ ] Generic typing still renders when no label is available.
- [ ] Polling updates pending assistant item label from API activity.
- [ ] Reply arrival clears the pending item as today.

**Verify**:
- `cd web && npx tsc --noEmit`

---

### T3: Render contextual loading labels

**What**: Render assistant pending labels in the transcript loading bubble.
**Where**:
`web/app/modules/onboarding/pages/onboarding-page/components/onboarding-transcript.tsx`
**Depends on**: T2

**Done when**:
- [ ] `readWebsiteUrl` activity displays `Pesquisando na web...`.
- [ ] `finishOnboarding` activity displays `Finalizando o onboarding...`.
- [ ] Unknown tool activity falls back gracefully.

**Verify**:
- `cd web && pnpm test -- onboarding-chat`

---

### T4: Add web tests for contextual loading

**What**: Cover generic typing, website reading, finalization, and clear-on-reply
behavior.
**Where**:
`web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat.test.ts`,
related transcript tests
**Depends on**: T3

**Done when**:
- [ ] Generic typing placeholder still passes existing tests.
- [ ] Website activity label is rendered.
- [ ] Finalization activity label is rendered.
- [ ] Activity label clears when an assistant message arrives.

**Verify**:
- `cd web && pnpm test -- onboarding-chat`
