# Onboarding Website Ingestion Tasks

**Design**: `api/.specs/features/onboarding-website-ingestion/design.md`
**Status**: Draft

---

## Execution Plan

```text
Phase 1 (Types + Module Boundary):
  T1 -> T2

Phase 2 (Neutral Web Content Services):
  T2 -> T3 -> T4
  T2 -> T5

Phase 3 (AI Tooling):
  T4/T5 -> T6 -> T7 -> T8

Phase 4 (Onboarding Integration):
  T8 -> T9
  T8 -> T10
  T8 -> T11 -> T12

Phase 5 (Docs + Validation):
  T9/T10/T12 -> T13 -> T14 -> T15 -> T16
```

---

## Task Breakdown

### T1: Define web content and website tool result types

**What**: Create shared TypeScript types for safe page reading and structured
website tool results.
**Where**:
`api/src/modules/web-content/types/web-content.types.ts`,
`api/src/modules/ai/tools/website-tool-result.types.ts`
**Depends on**: None
**Reuses**: Existing TypeScript strict-mode conventions.

**Done when**:
- [ ] Web content types cover validated URL, fetch result, extracted content,
      status metadata, and limits.
- [ ] `WebsiteToolResult` covers success, failed, blocked, unsupported, and
      no-content statuses.
- [ ] Types include URL, normalized URL, title, summary, key facts, timestamp,
      source metadata, and error reason.
- [ ] TypeScript compiles.

**Verify**:
- `cd api && npx tsc --noEmit`

---

### T2: Create `WebContentModule`

**What**: Add a neutral module for URL validation, bounded fetch, and text
extraction.
**Where**:
`api/src/modules/web-content/web-content.module.ts`,
`api/src/modules/web-content/services/`
**Depends on**: T1
**Reuses**: Nest module conventions.

**Done when**:
- [ ] Module is imported by `AiModule`.
- [ ] Module does not import `AiModule`, `CompaniesModule`, or
      `OnboardingModule`.
- [ ] Module exports only page-reading services.
- [ ] API dependencies include `@mozilla/readability` and `jsdom` plus required
      TypeScript types.
- [ ] TypeScript compiles.

**Verify**:
- `cd api && npx tsc --noEmit`

---

### T3: Implement `WebUrlPolicyService`

**What**: Normalize URLs and block unsafe protocols and network ranges.
**Where**:
`api/src/modules/web-content/services/web-url-policy.service.ts`
**Depends on**: T2
**Reuses**: Single-method service convention.

**Done when**:
- [ ] Allows only `http` and `https`.
- [ ] Resolves DNS before fetch.
- [ ] Blocks localhost, loopback, private, link-local, multicast, unspecified,
      and invalid IP ranges.
- [ ] Returns normalized URL and resolved metadata.
- [ ] Unit tests cover allowed and blocked cases.

**Verify**:
- `cd api && pnpm test -- web-url-policy`

---

### T4: Implement `WebPageFetchService`

**What**: Fetch bounded public website content after URL validation.
**Where**:
`api/src/modules/web-content/services/web-page-fetch.service.ts`
**Depends on**: T3
**Reuses**: `WebUrlPolicyService`

**Done when**:
- [ ] Uses manual redirect handling and validates every redirect URL.
- [ ] Aborts on timeout.
- [ ] Stops reading after configured byte limit.
- [ ] Allows supported HTML and plain text content only.
- [ ] Unit tests cover success, timeout, redirect limit, redirect-to-private,
      oversized response, and unsupported content type.

**Verify**:
- `cd api && pnpm test -- web-page-fetch`

---

### T5: Implement `WebPageContentExtractorService`

**What**: Convert supported HTML/plain text responses into clean readable text
and metadata.
**Where**:
`api/src/modules/web-content/services/web-page-content-extractor.service.ts`
**Depends on**: T2
**Reuses**: `@mozilla/readability` and `jsdom`.

**Done when**:
- [ ] HTML extraction parses documents with `jsdom`.
- [ ] Primary extraction uses `@mozilla/readability`.
- [ ] Fallback extraction uses cleaned `body.textContent` when Readability
      returns no article or insufficient text.
- [ ] Fallback removes script/style/nav-heavy noise.
- [ ] Plain text responses pass through bounded normalization.
- [ ] Extractor returns title, text, character count, and hash.
- [ ] Unit tests cover useful HTML, empty HTML, boilerplate-heavy HTML, and
      plain text.

**Verify**:
- `cd api && pnpm test -- web-page-content-extractor`

---

### T6: Implement `WebsiteSummaryService` in `AiModule`

**What**: Summarize cleaned website text into business-relevant Portuguese
Markdown and key facts.
**Where**:
`api/src/modules/ai/services/website-summary.service.ts`
**Depends on**: T4, T5
**Reuses**: `LangchainService`

**Done when**:
- [ ] Summary prompt treats source text as untrusted content.
- [ ] Summary output is concise Markdown in Portuguese.
- [ ] Key facts are extracted in a structured form.
- [ ] Unit tests cover prompt construction, no-content handling, and mocked LLM
      response parsing.

**Verify**:
- `cd api && pnpm test -- website-summary`

---

### T7: Implement `ReadWebsiteUrlTool`

**What**: Add the URL-reading agent tool that orchestrates safe page reading and
AI summarization, returning a structured tool result.
**Where**:
`api/src/modules/ai/tools/read-website-url.tool.ts`
**Depends on**: T6
**Reuses**: Existing `StructuredTool` pattern in `api/src/modules/ai/tools/`

**Done when**:
- [ ] Tool name is `readWebsiteUrl`.
- [ ] Tool schema accepts `{ url: string; reason?: string }`.
- [ ] Tool requires `companyId` from `AgentState.context`.
- [ ] Successful calls return a structured `WebsiteToolResult`.
- [ ] Recoverable URL/content failures return structured results instead of
      throwing.
- [ ] Unit tests cover success, blocked URL, no content, unsupported content,
      network failure, and missing company context.

**Verify**:
- `cd api && pnpm test -- read-website-url`

---

### T8: Register `readWebsiteUrl` on onboarding agent

**What**: Register the tool in the onboarding graph and update onboarding prompt
guidance.
**Where**:
`api/src/modules/ai/agents/onboarding-assistant.agent.ts`,
`api/src/modules/ai/agent-prompts/assistant-onboarding.ts`,
`api/src/modules/ai/ai.module.ts`
**Depends on**: T7
**Reuses**: Existing onboarding tool list and prompt builder.

**Done when**:
- [ ] `OnboardingAssistantAgent.getTools()` returns `finishOnboarding` and
      `readWebsiteUrl`.
- [ ] Client and owner agents do not expose `readWebsiteUrl`.
- [ ] Prompt tells the assistant to use the tool only for explicit
      owner-provided URLs.
- [ ] Prompt allows repeated same-turn calls when one owner message contains
      multiple explicit URLs, respecting configured limits.
- [ ] Existing `finishOnboarding` policy remains in place.
- [ ] Tests assert onboarding tool exposure and client/owner non-exposure.

**Verify**:
- `cd api && pnpm test -- onboarding-assistant`

---

### T9: Include website ToolMessages in `finishOnboarding`

**What**: Refactor final company profile generation to include successful
`readWebsiteUrl` ToolMessages from the active graph state.
**Where**:
`api/src/modules/ai/tools/finish-onboarding.tool.ts`
**Depends on**: T8
**Reuses**: Existing final Markdown generation flow and `Memory` transcript
lookup.

**Done when**:
- [ ] `finishOnboarding` includes successful website ToolMessages in the final
      extraction prompt.
- [ ] Prompt states that explicit owner conversation overrides website content.
- [ ] Final description does not include raw source dumps.
- [ ] `finishOnboarding` remains the only implementation path that writes the
      finalized website+conversation summary to `Company.description`.
- [ ] Unit tests cover generation with website ToolMessages and owner conflict
      precedence instructions.

**Verify**:
- `cd api && pnpm test -- finish-onboarding`

---

### T10: Cover repeated single-URL calls in one turn

**What**: Verify that multiple explicit URLs can be handled by repeated
single-URL tool calls in the same assistant turn.
**Where**:
`api/src/modules/ai/agents/onboarding-assistant.agent.ts`,
`api/src/modules/ai/agent-prompts/assistant-onboarding.ts`,
`api/src/modules/ai/tools/read-website-url.tool.ts`
**Depends on**: T8
**Reuses**: Single-URL tool behavior from T7.

**Done when**:
- [ ] Tool contract remains one URL per call.
- [ ] Prompt explicitly permits repeated calls for several explicit URLs.
- [ ] Per-turn URL limit is represented in prompt/config.
- [ ] Tests cover three URLs in one user message, duplicate URL avoidance where
      practical, and partial failure messaging.

**Verify**:
- `cd api && pnpm test -- read-website-url`
- `cd api && pnpm test -- onboarding-assistant`

---

### T11: Extend `ChatStateService` activity contract

**What**: Evolve chat state from `typing | null` to a backward-compatible
structured activity state.
**Where**:
`api/src/modules/message-queue/services/chat-state.service.ts`
**Depends on**: T8
**Reuses**: Existing Redis-backed typing state.

**Done when**:
- [ ] Existing `setTyping`, `clearTyping`, and `getState` behavior remains
      backward compatible.
- [ ] New activity methods can store `{ kind: 'tool', toolName, label }` with
      TTL.
- [ ] Redis-unavailable behavior remains a no-op fallback.
- [ ] Unit tests cover typing, tool activity, clear, TTL payload shape, and
      malformed stored values.

**Verify**:
- `cd api && pnpm test -- chat-state`

---

### T12: Expose tool activity from onboarding messages

**What**: Return activity metadata from `GET /onboarding/messages` and set tool
activity while known tools execute.
**Where**:
`api/src/modules/onboarding/use-cases/get-onboarding-messages.use-case.ts`,
`api/src/modules/ai/nodes/tool.node.ts`
**Depends on**: T11
**Reuses**: Existing onboarding polling contract and shared tool node.

**Done when**:
- [ ] `GET /onboarding/messages` returns `isTyping` and
      `activity: ChatActivity | null`.
- [ ] `readWebsiteUrl` execution exposes `Pesquisando na web...`.
- [ ] `finishOnboarding` execution exposes `Finalizando o onboarding...`.
- [ ] Unknown tools fall back to generic working activity if surfaced.
- [ ] Activity clears in success and failure paths.
- [ ] Unit tests cover onboarding message response mapping and tool-node
      set/clear behavior.

**Verify**:
- `cd api && pnpm test -- onboarding-messages`
- `cd api && pnpm test -- tool-node`

---

### T13: Add configuration and docs

**What**: Document URL-reading limits, ToolMessage behavior, and chat activity.
**Where**:
`api/.env.example`,
`README.md`,
`api/.specs/codebase/INTEGRATIONS.md`
**Depends on**: T4, T6, T12
**Reuses**: Existing env documentation style.

**Done when**:
- [ ] `.env.example` documents timeout, redirect, byte, text, and per-turn URL
      limits.
- [ ] README mentions onboarding website URL reading as part of setup behavior.
- [ ] Integration docs describe safe public website access constraints.
- [ ] Docs state that website evidence is carried through tool/conversation
      history.
- [ ] Docs describe contextual onboarding loading activities.

**Verify**:
- Documentation review.

---

### T14: Code review implemented changes

**What**: Review all API changes for correctness, security, coupling,
observability, and missing tests before expanding integration/E2E coverage.
**Where**:
All files changed by T1-T13
**Depends on**: T13
**Reuses**: Project code review skill/checklist and API conventions.

**Done when**:
- [ ] Review confirms `WebContentModule` has no dependency on AI/domain modules.
- [ ] Review confirms URL validation blocks SSRF-sensitive targets before fetch.
- [ ] Review confirms fetched website text is treated as untrusted source
      content.
- [ ] Review confirms `readWebsiteUrl` is one URL per call and initially exposed
      only to onboarding.
- [ ] Review confirms `finishOnboarding` preserves owner-message precedence over
      website ToolMessages.
- [ ] Review confirms chat activity clears in success and failure paths.
- [ ] Review findings are fixed or explicitly tracked before integration/E2E
      tests are finalized.

**Verify**:
- Code review notes/findings are recorded in the implementation handoff or PR.

---

### T15: Update API integration and E2E coverage

**What**: Add or update cross-module tests for the full onboarding URL-reading
flow and contextual activity behavior.
**Where**:
API integration/e2e test files following existing project conventions
**Depends on**: T14
**Reuses**: Existing onboarding validation stack and API testing conventions.

**Done when**:
- [ ] Integration tests cover `readWebsiteUrl` tool success with mocked fetch and
      mocked LLM summary.
- [ ] Integration tests cover blocked URL handling without outbound fetch.
- [ ] Integration tests cover `finishOnboarding` consuming website ToolMessages.
- [ ] Integration tests cover `GET /onboarding/messages` activity payload for
      generic typing, `readWebsiteUrl`, and `finishOnboarding`.
- [ ] E2E/onboarding validation coverage is updated so a user-provided URL can
      be exercised with deterministic mocks or fixtures.

**Verify**:
- `cd api && pnpm test`
- `pnpm onboarding-validation:test`

---

### T16: Run full API validation

**What**: Run unit, integration, E2E, and static validation after all
implementation and test-update tasks.
**Where**: `api/`
**Depends on**: T15
**Reuses**: API testing instructions in `api/AGENTS.md`

**Done when**:
- [ ] Unit tests pass.
- [ ] API integration tests covering onboarding URL reading/activity pass.
- [ ] Onboarding validation E2E passes.
- [ ] Lint passes.
- [ ] TypeScript check passes.

**Verify**:
- `cd api && pnpm test`
- `pnpm onboarding-validation:test`
- `cd api && pnpm lint`
- `cd api && npx tsc --noEmit`

---

## Parallel Execution Map

```text
Foundation:
  T1 -> T2

Web content:
  T2 -> T3 -> T4
  T2 -> T5

AI tooling:
  T4/T5 -> T6 -> T7 -> T8

Onboarding:
  T8 -> T9
  T8 -> T10
  T8 -> T11 -> T12

Validation:
  T9/T10/T12 -> T13 -> T14 -> T15 -> T16
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 Types | 2 type files | Granular |
| T2 WebContentModule | 1 module shell | Granular |
| T3 URL policy | 1 service | Granular |
| T4 Fetch | 1 service | Granular |
| T5 Content extractor | 1 service | Granular |
| T6 Summary service | 1 AI service | Granular |
| T7 URL tool | 1 tool | Granular |
| T8 Agent registration | 1 graph/prompt integration | Granular |
| T9 Finish integration | 1 tool change | Granular |
| T10 Repeated calls | prompt/tests over 1 tool | Granular |
| T11 Chat state contract | 1 service contract | Granular |
| T12 Activity exposure | use-case + shared tool-node integration | Acceptable |
| T13 Docs/config | docs/env | Granular |
| T14 Code review | full change review | Acceptable |
| T15 Integration/E2E coverage | cross-module tests | Acceptable |
| T16 Full validation | validation commands | Granular |
