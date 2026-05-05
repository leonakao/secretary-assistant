# Onboarding Website Ingestion Tasks

**Design**: `api/.specs/features/onboarding-website-ingestion/design.md`
**Status**: Draft

---

## Execution Plan

```text
Phase 1 (Foundation - Sequential):
  T1 -> T2

Phase 2 (Core Services - Parallel after T2):
  T2 -> T3 [P]
  T2 -> T4 [P]
  T2 -> T5 [P]

Phase 3 (Tool + Agent Integration - Sequential):
  T3/T4/T5 -> T6 -> T7 -> T8

Phase 4 (Repeated URL Calls + Tool Activity + Final Profile + Validation):
  T7 -> T11
  T7 -> T12
  T8 -> T9 -> T10
  T11/T12 -> T10
```

---

## Task Breakdown

### T1: Define website tool result types

**What**: Create shared TypeScript types for structured website tool results.
**Where**: `api/src/modules/ai/tools/website-tool-result.types.ts`
**Depends on**: None
**Reuses**: Existing TypeScript strict-mode conventions.

**Tools**:
- MCP: filesystem
- Skill: none

**Done when**:
- [ ] Types include success, failed, blocked, unsupported, and no-content
      statuses.
- [ ] Types include URL, normalized URL, title, summary, key facts, timestamp,
      source metadata, and error reason.
- [ ] TypeScript compiles.

**Verify**:
- `cd api && npx tsc --noEmit`

---

### T2: Register website service providers

**What**: Prepare module registration for reusable website validation, fetch,
extraction, and summary services without adding a database table.
**Where**: `api/src/modules/companies/companies.module.ts`,
`api/src/modules/ai/ai.module.ts`
**Depends on**: T1
**Reuses**: Existing module export rules in `api/.specs/codebase/CONVENTIONS.md`

**Tools**:
- MCP: filesystem
- Skill: none

**Done when**:
- [ ] Website services can be injected into AI tools.
- [ ] No website-ingestion repository or migration is introduced for the MVP.
- [ ] Only reusable services needed outside their module are exported.

**Verify**:
- `cd api && npx tsc --noEmit`

---

### T3: Implement URL validation service [P]

**What**: Create `WebsiteUrlPolicyService` that normalizes URLs and blocks
unsafe protocols and address ranges.
**Where**: `api/src/modules/companies/services/website-url-policy.service.ts`
**Depends on**: T2
**Reuses**: Single-method service convention.

**Tools**:
- MCP: filesystem
- Skill: none

**Done when**:
- [ ] Allows only `http` and `https`.
- [ ] Resolves DNS before fetch.
- [ ] Blocks localhost, loopback, private, link-local, multicast, unspecified,
      and invalid IP ranges.
- [ ] Returns normalized URL and resolved metadata.
- [ ] Unit tests cover allowed and blocked cases.

**Verify**:
- `cd api && pnpm test -- website-url-policy`

---

### T4: Implement bounded website fetch service [P]

**What**: Create `WebsiteFetchService` with timeout, redirect validation, byte
limit, and content-type checks.
**Where**: `api/src/modules/companies/services/website-fetch.service.ts`
**Depends on**: T2
**Reuses**: `WebsiteUrlPolicyService`

**Tools**:
- MCP: filesystem
- Skill: none

**Done when**:
- [ ] Uses manual redirect handling and validates every redirect URL.
- [ ] Aborts on timeout.
- [ ] Stops reading after configured byte limit.
- [ ] Allows supported HTML and plain text content only.
- [ ] Unit tests cover success, timeout, redirect limit, redirect-to-private,
      oversized response, and unsupported content type.

**Verify**:
- `cd api && pnpm test -- website-fetch`

---

### T5: Implement content extraction and summary services [P]

**What**: Create services that turn fetched HTML/text into cleaned text and
summarized business facts.
**Where**:
`api/src/modules/companies/services/website-content-extractor.service.ts`,
`api/src/modules/companies/services/website-summary.service.ts`
**Depends on**: T2
**Reuses**: `LangchainService`

**Tools**:
- MCP: filesystem
- Skill: none

**Done when**:
- [ ] HTML extraction removes script/style/nav-heavy noise.
- [ ] Extractor returns title, text, character count, and hash.
- [ ] Summary prompt treats source text as untrusted content.
- [ ] Summary output is concise Markdown in Portuguese.
- [ ] Unit tests cover useful HTML, empty HTML, plain text, and summarizer prompt
      construction.

**Verify**:
- `cd api && pnpm test -- website-content`
- `cd api && pnpm test -- website-summary`

---

### T6: Implement `ReadWebsiteUrlTool`

**What**: Add the URL-reading agent tool that orchestrates URL validation,
fetch, extraction, and summarization, returning a structured tool result.
**Where**: `api/src/modules/ai/tools/read-website-url.tool.ts`
**Depends on**: T3, T4, T5
**Reuses**: Existing `StructuredTool` pattern in `api/src/modules/ai/tools/`

**Tools**:
- MCP: filesystem
- Skill: none

**Done when**:
- [ ] Tool schema accepts `{ url: string; reason?: string }`.
- [ ] Tool requires `companyId` from `AgentState.context`.
- [ ] Successful calls return a structured `WebsiteToolResult`.
- [ ] Failure statuses return structured results instead of throwing for
      recoverable URL/content failures.
- [ ] Tool result is compact and suitable for the assistant and
      `finishOnboarding` to read later from graph history.
- [ ] Unit tests cover success, blocked URL, no content, duplicate URL, and
      missing company context.

**Verify**:
- `cd api && pnpm test -- read-website-url`

---

### T7: Add tool to onboarding assistant only

**What**: Register `ReadWebsiteUrlTool` in the onboarding graph and prompt,
without exposing it to client or owner agents.
**Where**:
`api/src/modules/ai/agents/onboarding-assistant.agent.ts`,
`api/src/modules/ai/agent-prompts/assistant-onboarding.ts`,
`api/src/modules/ai/ai.module.ts`
**Depends on**: T6
**Reuses**: Existing onboarding tool list and prompt builder.

**Tools**:
- MCP: filesystem
- Skill: none

**Done when**:
- [ ] `OnboardingAssistantAgent.getTools()` returns `finishOnboarding` and
      `readWebsiteUrl`.
- [ ] Client and owner agents do not expose `readWebsiteUrl`.
- [ ] Prompt tells the assistant to use the tool for explicit owner-provided
      URLs, summarize findings, and continue onboarding.
- [ ] Prompt states that multiple URLs in one owner message may be processed
      across repeated tool calls in the same turn, respecting configured limits.
- [ ] Existing `finishOnboarding` policy remains in place.
- [ ] Tests assert onboarding tool exposure and client/owner non-exposure.

**Verify**:
- `cd api && pnpm test -- onboarding-assistant`

---

### T8: Include website ToolMessages in `finishOnboarding`

**What**: Refactor final company profile generation to include website tool
results from the active graph/conversation history.
**Where**: `api/src/modules/ai/tools/finish-onboarding.tool.ts`
**Depends on**: T6
**Reuses**: Existing final Markdown generation flow.

**Tools**:
- MCP: filesystem
- Skill: none

**Done when**:
- [ ] `finishOnboarding` includes successful website ToolMessages in the final
      extraction prompt.
- [ ] Prompt states that explicit owner conversation overrides website content.
- [ ] Final description does not include raw source dumps.
- [ ] `finishOnboarding` remains the only implementation path that writes the
      finalized website+conversation summary to `Company.description`.
- [ ] Website tool results are read as supporting evidence and are not used to
      bypass explicit onboarding finalization.
- [ ] Unit tests cover generation with website ToolMessages and owner conflict
      precedence instructions.

**Verify**:
- `cd api && pnpm test -- finish-onboarding`

---

### T9: Add configuration and docs

**What**: Document website URL-reading limits and MVP persistence behavior.
**Where**:
`api/.env.example`,
`README.md`,
`api/.specs/codebase/INTEGRATIONS.md`
**Depends on**: T4, T5
**Reuses**: Existing env documentation style.

**Tools**:
- MCP: filesystem
- Skill: none

**Done when**:
- [ ] `.env.example` documents timeout, redirect, byte, and text limits.
- [ ] README mentions onboarding website URL reading as part of setup behavior.
- [ ] Integration docs describe safe public website access constraints.
- [ ] Docs state that MVP stores website evidence in tool/conversation history,
      not a dedicated relational table.

**Verify**:
- Documentation review.

---

### T10: Run full API validation

**What**: Run the API validation suite after all implementation tasks.
**Where**: `api/`
**Depends on**: T1-T9, T11, T12
**Reuses**: API testing instructions in `api/AGENTS.md`

**Tools**:
- MCP: filesystem
- Skill: none

**Done when**:
- [ ] Unit tests pass.
- [ ] Lint passes.
- [ ] TypeScript check passes.

**Verify**:
- `cd api && pnpm test`
- `cd api && pnpm lint`
- `cd api && npx tsc --noEmit`

---

### T11: Support repeated single-URL tool calls in one turn

**What**: Ensure the assistant can process multiple explicit URLs from one owner
message by issuing repeated `readWebsiteUrl` calls in the same turn, with
per-turn limits and partial success reporting through normal tool results.
**Where**:
`api/src/modules/ai/tools/read-website-url.tool.ts`,
`api/src/modules/ai/agents/onboarding-assistant.agent.ts`,
`api/src/modules/ai/agent-prompts/assistant-onboarding.ts`
**Depends on**: T6, T7
**Reuses**: Single-URL reading orchestration from T6.

**Tools**:
- MCP: filesystem
- Skill: none

**Done when**:
- [ ] Tool contract remains one URL per call.
- [ ] Prompt tells the assistant it may call `readWebsiteUrl` repeatedly
      in the same turn when the owner sends multiple explicit URLs.
- [ ] Per-turn URL limit is enforced.
- [ ] Each successful call produces its own structured tool result.
- [ ] Partial failures are represented by normal failed tool results and the
      assistant summarizes successes/failures to the owner.
- [ ] Unit tests cover three URLs in one user message, duplicate URLs, and
      partial failure.

**Verify**:
- `cd api && pnpm test -- read-website-url`

---

### T12: Expose contextual tool activity state

**What**: Extend onboarding chat state so long-running tool execution can expose
specific loading labels to the web chat.
**Where**:
`api/src/modules/message-queue/services/chat-state.service.ts`,
`api/src/modules/onboarding/use-cases/get-onboarding-messages.use-case.ts`,
`api/src/modules/ai/nodes/tool.node.ts`
**Depends on**: T7, T8
**Reuses**: Existing Redis-backed typing state and onboarding polling contract.

**Tools**:
- MCP: filesystem
- Skill: none

**Done when**:
- [ ] Chat state can store generic typing and structured tool activity with TTL.
- [ ] `GET /onboarding/messages` returns a backward-compatible `isTyping` and a
      new activity payload/code.
- [ ] `readWebsiteUrl` execution exposes `Pesquisando na web...`.
- [ ] `finishOnboarding` execution exposes `Finalizando o onboarding...`.
- [ ] Activity clears in success and failure paths.
- [ ] Redis-unavailable behavior remains a no-op fallback.
- [ ] Unit tests cover activity set/get/clear and onboarding message response
      mapping.

**Verify**:
- `cd api && pnpm test -- chat-state`
- `cd api && pnpm test -- onboarding-messages`

---

## Parallel Execution Map

```text
Foundation:
  T1 -> T2

Core services after T2:
  T3 [P] URL policy
  T4 [P] fetch service
  T5 [P] extraction + summary

Integration:
  T3/T4/T5 -> T6 -> T7
                 \-> T8
                 \-> T11
                 \-> T12

Validation:
  T8/T9/T11/T12 -> T10
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 Tool result types | 1 type file | Granular |
| T2 Module registration | provider wiring | Granular |
| T3 URL policy | 1 service | Granular |
| T4 Fetch | 1 service | Granular |
| T5 Extraction + summary | 2 cohesive services | Acceptable |
| T6 Tool | 1 tool | Granular |
| T7 Agent prompt/tool registration | 1 graph integration | Granular |
| T8 Finish integration | 1 tool change | Granular |
| T11 Repeated URL calls | prompt/limit behavior over 1 tool | Granular |
| T12 Tool activity state | chat-state contract extension | Granular |
