# State

**Last updated:** 2026-03-23
**Current phase:** Brownfield mapping + project initialization

## Current Focus

Setting up spec-driven development structure for the secretary-assistant monorepo.

## What Was Done This Session

- Converted repository to monorepo: moved all API files into `api/`, created empty `web/`
- Moved root-level config files to monorepo root: `.gitignore`, `.editorconfig`, `.prettierrc`
- Moved `docker-compose.yaml` to root, updated build context and volume paths to `./api`
- Created root `README.md` with project overview
- Updated all 6 codebase docs in `api/.specs/codebase/` (were stale from a previous project)
- Created `api/.specs/project/PROJECT.md`, `ROADMAP.md`, `STATE.md`

## Architecture Decisions

- **Monorepo layout:** `api/` (NestJS) + `web/` (React SPA, TBD)
- **WhatsApp via Evolution API:** self-hosted in docker-compose
- **LLM:** OpenAI GPT models via LangChain/LangGraph, with OpenAI embeddings for semantic memory
- **Agent persistence:** PostgresSaver (checkpointer schema) + PostgresStore (vector schema)
- **Three agent modes:** Client, Owner, Onboarding — selected by ConversationStrategy

## Active Blockers

None.

## Pending Decisions

- pnpm workspace setup at monorepo root (not yet configured — `web/` is empty)
- Web tech stack details for the React SPA (framework choices, UI library, auth approach)

## Preferences

- (none recorded yet)
