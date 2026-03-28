# Onboarding Component Decomposition

## Summary

The web onboarding experience has grown in scope and now concentrates too many responsibilities inside a small set of UI components.

- The main onboarding chat component should be decomposed into smaller subcomponents and supporting hooks.
- The refactor must preserve the current user-visible behavior, UX flow, and API contracts.
- The result should improve maintainability, readability, testability, and separation of concerns.

This is a technical refactor focused on the onboarding web flow. It is not a feature redesign.

## Problem

The onboarding flow has become harder to reason about and change safely because core responsibilities are mixed together in a single large component.

Today:

- `onboarding-chat.tsx` mixes transcript rendering, initialization loading, input focus management, text sending, audio recording, audio preview, transcription placeholder handling, and error states
- the component is large enough that behavior changes carry higher regression risk
- tests are harder to target at the right level because unrelated concerns live in the same file
- future onboarding changes are more likely to introduce bugs or duplicate logic

This does not yet create a user-facing defect, but it raises delivery risk and slows further onboarding work.

## Goal

Refactor the onboarding web UI into smaller, clearer units without changing external behavior, user experience, or backend integration contracts.

## In Scope

- Decomposition of `web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat.tsx`
- Extraction of smaller presentation or stateful subcomponents where it improves clarity
- Extraction of reusable hooks or helpers where it improves state isolation and testability
- Minor supporting cleanup in the onboarding page area when directly required by the decomposition
- Preservation or improvement of automated test coverage during the refactor

## Out of Scope

- Any intentional change to onboarding UX, copy, or interaction rules
- Any API contract change between `web/` and `api/`
- Refactoring unrelated application areas outside the onboarding page surface
- Visual redesign of onboarding screens
- New onboarding features or product behavior

## Users

- Frontend engineers working on onboarding
- Reviewers and maintainers responsible for onboarding changes
- QA validating onboarding regressions

## Stakeholders

- Delivery lead coordinating future onboarding work
- Product and engineering owners who depend on safe iteration in the onboarding flow

## Functional Requirements

1. The refactor must preserve all current onboarding chat behaviors, including:
   - automatic conversation initialization
   - transcript rendering
   - focus recovery after init, success, and recoverable failure
   - text sending behavior
   - audio hold-to-record behavior
   - audio preview with send and delete actions
   - pending transcription placeholder behavior
   - completion handling
2. External props and integration contracts may change internally between extracted subcomponents, but the behavior exposed by the onboarding page must remain unchanged.
3. The onboarding page must continue to use the same backend API contracts already approved for onboarding refinement.
4. Tests covering the current onboarding flow must remain valid or be updated to assert equivalent behavior after decomposition.

## Likely Decomposition Targets

These are likely targets, not final design commitments:

- transcript/message list rendering
- chat composer
- audio recording trigger/control surface
- recorded audio preview
- pending transcription bubble or placeholder
- focus or audio state management hooks

## Non-Functional Requirements

- The resulting structure must reduce cognitive load compared to the current component
- Responsibilities should be isolated enough that future onboarding changes can be implemented with narrower file ownership
- The decomposition should improve unit or component-level testability
- Naming and file boundaries should make onboarding behavior easier to scan and review
- No measurable regression should be introduced in desktop or mobile onboarding usability

## Constraints

- Existing behavior is the source of truth; the refactor must preserve it
- API request and response contracts must remain unchanged
- Existing accessibility behavior, including keyboard usability, must not regress
- The refactor should stay local to onboarding files unless a small shared helper extraction is clearly justified

## Edge Cases

### Hidden behavior changes during extraction

- splitting code into subcomponents must not accidentally change mount timing, focus timing, or loading transitions

### Audio state fragmentation

- extracting audio logic must not lose cleanup behavior for recorder state, preview state, or pending transcription state

### Duplicate local state

- decomposition must avoid introducing conflicting copies of transcript or composer state across child components

### Test drift

- if tests move to new files or levels, they must still cover the approved onboarding behavior rather than only the new component structure

## Acceptance Criteria

1. The onboarding web flow behaves the same before and after the refactor from the user perspective.
2. The onboarding chat implementation is decomposed into smaller units with clearer responsibilities than the current single large component.
3. The extracted structure makes transcript rendering, composer behavior, and audio-specific behavior easier to understand in isolation.
4. No approved onboarding API contract is changed by this refactor.
5. Existing onboarding tests remain green or are replaced with equivalent-or-better coverage.
6. The refactor does not regress focus behavior, initialization behavior, or audio behavior.

## Open Decisions To Confirm

1. Whether the decomposition should stay entirely inside `components/` or may introduce onboarding-specific hooks alongside components.
2. Whether `onboarding-page/index.tsx` should remain mostly orchestration-only or may absorb some composition logic during the refactor.
3. Whether this refactor should stop at the onboarding chat boundary or also clean nearby onboarding page files when the new structure makes that clearly beneficial.
