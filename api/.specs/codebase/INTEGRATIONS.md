# External Integrations

## WhatsApp — Evolution API

**Service:** Evolution API v2.1.1 (self-hosted)
**Purpose:** Send and receive WhatsApp messages
**Implementation:** `src/modules/evolution/services/evolution.service.ts`
**Configuration:** `EVOLUTION_API_KEY` env var; service URL configured via env
**Webhook:** `POST /webhooks/evolution` (`EvolutionWebhookController` in `ChatModule`)
**Events handled:** Incoming messages routed through `IncomingMessageUseCase`

## AI — Google Gemini

**Service:** Google Generative AI (Gemini 2.5 Flash)
**Purpose:** LLM powering all assistant agents
**Implementation:** `@langchain/google-genai` — `ChatGoogleGenerativeAI` in each agent
**Configuration:** `GOOGLE_API_KEY` env var
**Used by:** `ClientAssistantAgent`, `OwnerAssistantAgent`, `OnboardingAssistantAgent`

## Agent Framework — LangGraph

**Service:** `@langchain/langgraph` + `@langchain/langgraph-checkpoint-postgres`
**Purpose:** Stateful multi-turn agent graphs with tool calling
**Implementation:** `src/modules/ai/agents/`, `src/modules/ai/nodes/`, `src/modules/ai/stores/`
**Checkpoint persistence:** PostgreSQL schema `checkpointer` (auto-setup via `PostgresSaver.setup()`)
**Long-term memory:** PostgreSQL vector store schema (via `PostgresStore`)

## Database — PostgreSQL + pgvector

**Service:** PostgreSQL 17 with pgvector extension (`pgvector/pgvector:pg17`)
**Purpose:** Primary data store + vector embeddings for memory/search
**Implementation:** TypeORM (`src/database/`)
**Configuration:** `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` env vars
**Schemas:** default (app entities), `checkpointer` (LangGraph), vector store schema

## Infrastructure

**Local:** docker-compose (3 services: `app`, `db`, `evolution-api`)
**Migrations:** Run inside container — `docker compose exec api sh` → `pnpm migration:run`
