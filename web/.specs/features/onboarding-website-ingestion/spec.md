# Onboarding Website Ingestion Web Specification

**Root Spec**: `../../../../.specs/features/onboarding-website-ingestion/spec.md`
**Scope**: `web/`

## Problem Statement

The onboarding chat already shows a generic assistant loading state while the
backend prepares a reply. Website reading and onboarding finalization can take
longer than normal generation, so the UI should show a contextual loading label
when the API reports a tool-specific activity.

## Goals

- [ ] Render contextual assistant loading labels from the onboarding API.
- [ ] Preserve the current generic typing/loading behavior as a fallback.
- [ ] Keep the transcript free of fake persisted assistant messages.

## Out of Scope

- Adding a dedicated URL input UI.
- Showing raw tool outputs to the owner.
- Adding web support for owner/client agent URL reading outside onboarding.

---

## User Stories

### P1: Render Tool-Specific Loading

**User Story**: As a business owner, I want the loading bubble to say what the
assistant is doing so that I know the system is still working.

**Acceptance Criteria**:

1. WHEN the onboarding API reports `readWebsiteUrl` activity THEN the chat SHALL
   show `Pesquisando na web...`.
2. WHEN the onboarding API reports `finishOnboarding` activity THEN the chat
   SHALL show `Finalizando o onboarding...`.
3. WHEN the onboarding API reports generic typing or no known activity THEN the
   chat SHALL show the existing generic assistant typing label.
4. WHEN the assistant reply arrives THEN the contextual loading item SHALL be
   removed from the transcript.

**Independent Test**: Mock polling responses for generic typing,
`readWebsiteUrl`, and `finishOnboarding`; verify the loading bubble text changes
and clears when a new assistant message arrives.

---

## Success Criteria

- [ ] Unit/component tests cover contextual loading labels.
- [ ] Integration/E2E tests cover activity payloads for URL reading and
      onboarding finalization.
- [ ] Existing onboarding validation still passes when no activity payload is
      present.
