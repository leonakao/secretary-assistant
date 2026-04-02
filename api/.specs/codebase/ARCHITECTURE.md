# Architecture

**Pattern:** NestJS modular monolith (API only, monorepo with `web/` planned)

## High-Level Structure

```
Incoming WhatsApp message
  → Evolution API (self-hosted)
  → POST /webhooks/evolution/:companyId/messages-upsert (EvolutionWebhookController)
  → IncomingMessageUseCase
  → ConversationStrategy (Client | Owner | Onboarding)
  → Agent (ClientAssistantAgent | OwnerAssistantAgent | OnboardingAssistantAgent)
  → LangGraph StateGraph (assistant node → tool nodes → assistant node)
  → EvolutionService.sendMessage() → WhatsApp
```

## Key Modules

- **MonitorModule** — global exception filter + request logger middleware; registered first in AppModule
- **DatabaseModule** — TypeORM async factory using shared `dataSourceOptions`; exports TypeOrmModule globally
- **AiModule** — LLM agents, tools, LangGraph graphs, LangChain services
- **ChatModule** — webhook controller, conversation strategies, chat service, memory entity
- **EvolutionModule** — HTTP client wrapper around Evolution API
- **AuthModule** — Auth0 token verification, request session resolution, `SessionGuard`
- **UsersModule** — User entity + protected `GET /users/me`
- **CompaniesModule** — Company + UserCompany entities; multi-tenant owner support
- **ContactsModule** — Contact entity (WhatsApp contacts / clients)
- **ServiceRequestsModule** — ServiceRequest + Confirmation entities and services

## AI Agent Pattern (LangGraph)

Each agent (`ClientAssistantAgent`, `OwnerAssistantAgent`, `OnboardingAssistantAgent`) builds a `StateGraph`:

```
START → detectTransfer → assistant ↔ tools → END
                      ↘ requestHuman → END
```

- **State:** `AgentState` (messages + context)
- **Checkpointer:** `PostgresSaver` (schema: `checkpointer`) — persists conversation thread state
- **Store:** `PostgresStore` — long-term memory via vector store schema
- **Tools:** NestJS-injectable `StructuredTool` classes (create/search/update for service-requests, contacts, confirmations, memory, send-message)
- **Model:** `ChatGoogleGenerativeAI` (gemini-2.5-flash, temp 0.6, max 2048 tokens)

## Conversation Strategy Pattern

`IncomingMessageUseCase` selects a strategy based on contact/company state:
- `ClientConversationStrategy` — handles client-facing interactions
- `OwnerConversationStrategy` — handles business owner interactions
- `OnboardingConversationStrategy` — handles new company onboarding flow

## Data Layer

- `src/database/database.config.ts` — shared `DataSourceOptions` (SnakeCaseNamingStrategy, auto-discovers `*.entity.ts`)
- `src/database/data-source.ts` — exported `DataSource` instance for TypeORM CLI
- `src/database/migrations/` — timestamped schema changes, including auth-backed user identity fields
- Migrations run with: `docker compose exec api sh` → `pnpm migration:run`

## Module Dependency Flow

```
ChatModule ←→ AiModule (forwardRef)
ChatModule → EvolutionModule
ChatModule → ServiceRequestsModule
AiModule → ServiceRequestsModule
```

## Bootstrap

- `main.ts`: Global `ValidationPipe` (whitelist, forbidNonWhitelisted, transform); listens on port 3000
