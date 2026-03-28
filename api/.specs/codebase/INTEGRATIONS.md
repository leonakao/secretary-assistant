# External Integrations

## WhatsApp — Evolution API

**Service:** Evolution API v2.1.1 (self-hosted)
**Purpose:** Send and receive WhatsApp messages
**Implementation:** `src/modules/evolution/services/evolution.service.ts`
**Configuration:** `EVOLUTION_API_KEY` env var; service URL configured via env
**Webhook:** `POST /webhooks/evolution` (`EvolutionWebhookController` in `ChatModule`)
**Events handled:** Incoming messages routed through `IncomingMessageUseCase`

## AI — OpenAI Chat Models

**Service:** OpenAI GPT chat models
**Purpose:** LLM powering assistant agents and helper chat tasks
**Implementation:** `@langchain/openai` through `getLlmModel(type)` in `src/modules/ai/services/llm-model.service.ts`
**Configuration:** `OPENAI_API_KEY` env var
**Model routing:** `user-interaction -> gpt-5-mini`, `helper -> gpt-5-nano`
**Used by:** `ClientAssistantAgent`, `OwnerAssistantAgent`, `OnboardingAssistantAgent`, `LangchainService`

## AI — OpenAI Audio Transcription

**Service:** OpenAI Audio API
**Purpose:** Speech-to-text for incoming audio messages
**Implementation:** `openai` SDK in `src/modules/ai/services/audio-transcription.service.ts`
**Configuration:** `OPENAI_API_KEY` env var
**Model:** `gpt-4o-mini-transcribe`

## AI — Google Gemini Embeddings

**Service:** Google Generative AI embeddings
**Purpose:** Vector embeddings for memory/search
**Implementation:** `@langchain/google-genai` in `src/modules/ai/stores/postgres.store.ts`
**Configuration:** `GOOGLE_API_KEY` env var

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
