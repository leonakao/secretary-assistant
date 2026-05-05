# Onboarding Website Ingestion Specification

**Root Spec**: `../../../../.specs/features/onboarding-website-ingestion/spec.md`
**Scope**: `api/`

## Problem Statement

The API owns onboarding state, agent execution, company profile persistence, and
network access. To let the onboarding assistant use URLs provided by the owner,
the API must expose a safe agent tool that fetches public website content,
extracts business facts, returns a structured tool result, and feeds that
context back into the onboarding conversation.

## Goals

- [ ] Add a URL-reading tool for owner-provided public website URLs, registered
      only on the onboarding assistant in the MVP.
- [ ] Add bounded URL validation and HTTP fetch behavior suitable for untrusted
      user input.
- [ ] Return compact, structured website summaries as tool results that remain
      available in the active conversation/tool history.
- [ ] Use LLM summarization only after deterministic fetch, cleanup, and size
      limits.
- [ ] Include website-derived context in onboarding prompts and final company
      description generation.
- [ ] Keep `finishOnboarding` as the canonical step that merges onboarding
      conversation and website evidence into `Company.description`.
- [ ] Make successful website-derived facts available to the active agent
      through ToolMessages, without requiring a dedicated website-ingestion table
      in the MVP.
- [ ] Expose contextual onboarding assistant activity while long-running tools
      execute so the web chat can show tool-specific loading text.

## Out of Scope

- Web UI changes for dedicated URL fields.
- A dedicated website-ingestion database table in the MVP.
- Browser rendering or JavaScript execution.
- Crawling links that the owner did not explicitly provide.
- Background refresh jobs.
- Client or owner assistant access to the URL-reading tool outside onboarding.

---

## User Stories

### P1: Onboarding Agent Tool Reads A Public URL - MVP

**User Story**: As the onboarding assistant, I want a tool that reads a public
URL from the owner so that I can use the website facts while configuring the
company.

**Why P1**: This is the backend vertical slice required by the product behavior.

**Acceptance Criteria**:

1. WHEN the onboarding assistant receives an owner-provided URL THEN it SHALL be
   able to call a `readWebsiteUrl` tool with that URL.
2. WHEN the tool succeeds THEN it SHALL return a structured result containing
   normalized URL, title, summary, key business facts, source metadata, and
   timestamp.
3. WHEN the tool succeeds THEN the returned ToolMessage SHALL be available to
   the active onboarding agent so later assistant responses in the same graph
   thread can use the website-derived facts.
4. WHEN the tool returns THEN it SHALL provide enough structured summarized
   evidence for the assistant to explain what was found, avoid re-asking known
   details, and ask the next missing or validation question.
5. WHEN the tool is called outside an onboarding company context THEN it SHALL
   fail clearly without fetching anything.

**Independent Test**: Run the onboarding agent with a mocked public HTML fetch
and verify that `readWebsiteUrl` returns a structured ToolMessage and the
assistant can reference it in the following response.

---

### P1: Safe Website Fetch Boundary

**User Story**: As the API operator, I want website fetches to enforce strict
network and content limits so that the feature cannot access internal resources
or consume unbounded compute.

**Why P1**: This is mandatory before exposing any user-controlled URL fetch.

**Acceptance Criteria**:

1. WHEN a URL is not `http` or `https` THEN validation SHALL reject it before
   DNS lookup.
2. WHEN DNS resolves to a blocked address range THEN validation SHALL reject it
   before HTTP fetch.
3. WHEN redirects occur THEN each redirect target SHALL be revalidated and the
   chain SHALL stop after the configured redirect limit.
4. WHEN response body exceeds the configured byte limit THEN fetch SHALL abort
   and return a failed tool result.
5. WHEN response content type is not supported HTML or plain text THEN fetch
   SHALL abort before summarization.

**Independent Test**: Unit-test URL validation and fetch service with localhost,
private IP, unsupported protocol, redirect-to-private, oversized body, and valid
HTML cases.

---

### P1: Expose Tool-Specific Onboarding Activity

**User Story**: As the web onboarding chat, I want to know when the assistant is
executing a known long-running tool so that I can show a specific loading label
to the owner.

**Why P1**: `readWebsiteUrl` and `finishOnboarding` can take longer than a normal
assistant response and need clear user feedback.

**Acceptance Criteria**:

1. WHEN the onboarding assistant is preparing a normal response THEN the API
   SHALL expose a generic activity compatible with the current typing indicator.
2. WHEN `readWebsiteUrl` starts executing THEN the API SHALL expose an activity
   with label `Pesquisando na web...` or an equivalent stable activity code that
   the web maps to that label.
3. WHEN `finishOnboarding` starts executing THEN the API SHALL expose an
   activity with label `Finalizando o onboarding...` or an equivalent stable
   activity code that the web maps to that label.
4. WHEN the tool finishes or throws THEN the API SHALL clear or return to the
   appropriate assistant activity.
5. WHEN Redis/chat-state storage is unavailable THEN conversation processing
   SHALL still complete and the UI SHALL gracefully fall back to generic loading.

**Independent Test**: Mock onboarding graph execution with `readWebsiteUrl` and
`finishOnboarding` tool calls, then verify `/onboarding/messages` returns the
expected activity state while each tool is running.

---

### P2: Read Multiple URLs From One Message

**User Story**: As the onboarding assistant, I want to process multiple explicit
URLs from the same owner message so that services, prices, contact details, and
FAQs can come from different pages without asking the owner to resend them one
by one.

**Why P2**: Useful after the single-page flow is stable.

**Acceptance Criteria**:

1. WHEN one onboarding message contains multiple URLs THEN the assistant SHALL
   be able to request multiple `readWebsiteUrl` tool calls in the same
   turn, subject to configured limits.
2. WHEN multiple URLs are read in one turn THEN each successful URL SHALL
   produce a structured tool result with source metadata.
3. WHEN duplicate normalized URLs appear in one message THEN the agent SHALL
   avoid duplicate tool calls where practical and the final summary SHALL avoid
   duplicate facts.
4. WHEN company description is regenerated THEN website facts SHALL be merged
   with conversation facts without duplicating sections.
5. WHEN website summaries and explicit owner conversation disagree THEN
   `finishOnboarding` SHALL prefer explicit owner conversation.

**Independent Test**: Run the onboarding agent with one message containing three
URLs, mock two successful tool calls and one repeated URL, then verify the graph
history contains the successful tool results and final description includes
merged facts once.

---

## Edge Cases

- WHEN the page has no useful text THEN return status `no_content` in the tool
  result and do not alter company knowledge.
- WHEN summarization fails after fetch succeeds THEN return failure metadata and
  keep onboarding usable.
- WHEN website facts conflict with later owner messages THEN later explicit owner
  messages override website facts in the final profile.
- WHEN source text includes model instructions THEN summarization SHALL treat the
  text as untrusted content, not executable instructions.

---

## Success Criteria

- [ ] `OnboardingAssistantAgent` exposes `finishOnboarding` and
      `readWebsiteUrl`, with `readWebsiteUrl` available only in the onboarding
      graph for the MVP.
- [ ] URL validation blocks SSRF-sensitive targets before fetch.
- [ ] Website tool results are visible to the active onboarding agent.
- [ ] `finishOnboarding` includes website ToolMessages when generating the final
      company description.
- [ ] `pnpm test`, `pnpm lint`, and `npx tsc --noEmit` pass in `api/`.
