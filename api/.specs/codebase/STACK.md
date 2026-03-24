# Tech Stack

**Analyzed:** 2026-03-23

## Core

- Framework: NestJS 11.x
- Language: TypeScript 5.7.x
- Runtime: Node.js >=20.0.0
- Package manager: pnpm

## Backend

- API Style: REST (NestJS controllers)
- Database: PostgreSQL + pgvector (via TypeORM 0.3.x)
- ORM: TypeORM with SnakeCase naming strategy + migrations
- Validation: class-validator + class-transformer (DTOs)
- Schema: pgvector extension (vector store), checkpointer schema (LangGraph)

## AI / LLM

- LLM: Google Gemini 2.5 Flash via `@langchain/google-genai`
- Agent framework: LangGraph (`@langchain/langgraph`) — StateGraph with tool nodes
- Checkpoint persistence: `@langchain/langgraph-checkpoint-postgres`
- Schema validation: Zod

## WhatsApp Integration

- Provider: Evolution API v2.1.1 (self-hosted via Docker)
- Communication: HTTP calls to Evolution API + incoming webhooks

## Testing

- Unit/Integration: Vitest 3.x + @vitest/coverage-v8
- HTTP testing: supertest
- Compiler: unplugin-swc (SWC for test speed)

## Development Tools

- Compiler: SWC (via NestJS CLI)
- Linting: ESLint 9.x (typescript-eslint)
- Formatting: Prettier (single quotes, trailing commas)
- Containers: Docker multi-stage build
- Local orchestration: docker-compose (api + db + evolution-api)
- Config: dotenv + @nestjs/config (global ConfigModule)
