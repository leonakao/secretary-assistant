# State

**Last updated:** 2026-05-05
**Current phase:** Feature planning

## Current Focus

Planning onboarding website ingestion so the onboarding assistant can load
public company information from owner-provided URLs.

## What Was Done This Session

- Created root feature spec:
  `.specs/features/onboarding-website-ingestion/spec.md`
- Created API feature spec/design/tasks:
  `api/.specs/features/onboarding-website-ingestion/`
- Scoped MVP to explicit owner-provided public HTTP/HTTPS URLs pasted in the
  onboarding conversation.
- Planned API implementation around an onboarding-only `readWebsiteUrl`
  tool with safe URL validation, bounded fetch, text extraction, LLM summary,
  and structured ToolMessage output.

## Architecture Decisions

- **Monorepo layout:** `api/` (NestJS) + `web/` (React SPA, TBD)
- **WhatsApp via Evolution API:** self-hosted in docker-compose
- **LLM:** OpenAI GPT models via LangChain/LangGraph, with OpenAI embeddings for semantic memory
- **Agent persistence:** PostgresSaver (checkpointer schema) + PostgresStore (vector schema)
- **Three agent modes:** Client, Owner, Onboarding — selected by ConversationStrategy
- **Onboarding website URL reading:** expose website access only through
  `readWebsiteUrl`, registered on onboarding initially; use explicit URLs only
  for MVP; keep website summaries in structured ToolMessages instead of a
  dedicated table; reject unsafe network targets before fetch.
- **Feature integration for onboarding evidence:** website URL reading must feed
  the existing `finishOnboarding` summary path. `finishOnboarding` remains the
  canonical writer of the finalized `Company.description`, merging conversation
  memory with successful website ToolMessages.
- **Onboarding interviewer context:** successful website summaries should be
  visible to the active assistant through graph ToolMessages. Avoid an
  onboarding-specific evidence context service in the MVP so the URL-reading
  capability can later be reused by `OwnerAssistantAgent`.
- **Multiple URLs in one message:** keep `readWebsiteUrl` as a single-URL
  tool. If the owner sends several explicit URLs in one message, the agent may
  call the same tool multiple times in that turn, within configured limits.
- **Contextual onboarding loading:** extend the existing onboarding typing state
  into a structured activity state so the web chat can show tool-specific
  loading labels such as `Pesquisando na web...` and
  `Finalizando o onboarding...`.

## Active Blockers

None.

## Pending Decisions

- (none)

## Preferences

- (none recorded yet)
