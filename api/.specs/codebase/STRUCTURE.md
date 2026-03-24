# Project Structure

**Root:** `/secretary-assistant` (monorepo)

## Directory Tree

```
secretary-assistant/          ← monorepo root
├── .gitignore
├── .editorconfig
├── .prettierrc
├── docker-compose.yaml
├── README.md
├── api/                      ← NestJS backend
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── database/
│   │   │   ├── database.config.ts
│   │   │   ├── database.module.ts
│   │   │   ├── data-source.ts
│   │   │   ├── migrations/
│   │   │   └── naming-strategies/
│   │   └── modules/
│   │       ├── ai/           ← agents, tools, nodes, services, stores
│   │       ├── chat/         ← webhook controller, strategies, use-cases
│   │       ├── companies/
│   │       ├── contacts/
│   │       ├── evolution/    ← Evolution API HTTP client
│   │       ├── monitor/      ← global exception filter, logger middleware
│   │       ├── service-requests/
│   │       └── users/
│   ├── Dockerfile
│   ├── nest-cli.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── vitest.config.ts
│   ├── eslint.config.mjs
│   ├── .env.example
│   └── .specs/
│       └── codebase/
└── web/                      ← React SPA (planned, empty)
```

## Module Organization

### ai
**Purpose:** LLM agents and tools
**Location:** `src/modules/ai/`
**Key files:** `ai.module.ts`, `agents/*.agent.ts`, `tools/*.tool.ts`, `nodes/*.node.ts`, `services/langchain.service.ts`, `stores/postgres.store.ts`, `agent-prompts/`

### chat
**Purpose:** Entry point for incoming WhatsApp messages; conversation routing
**Location:** `src/modules/chat/`
**Key files:** `controllers/evolution-webhook.controller.ts`, `use-cases/incoming-message.use-case.ts`, `strategies/*.strategy.ts`, `services/chat.service.ts`

### evolution
**Purpose:** HTTP wrapper for Evolution API (send messages, manage WhatsApp sessions)
**Location:** `src/modules/evolution/`
**Key files:** `services/evolution.service.ts`

### monitor
**Purpose:** Cross-cutting observability — global exception filter + HTTP request logger
**Location:** `src/modules/monitor/`
**Key files:** `filters/global-exception.filter.ts`, `middlewares/logger.middleware.ts`

### database
**Purpose:** TypeORM configuration and migrations
**Location:** `src/database/`
**Key files:** `database.config.ts`, `data-source.ts`, `migrations/`

## Where Things Live

**Incoming message flow:**
- HTTP entry: `src/modules/chat/controllers/`
- Routing logic: `src/modules/chat/use-cases/`
- Conversation strategies: `src/modules/chat/strategies/`
- AI processing: `src/modules/ai/agents/`

**Agent tools:**
- Location: `src/modules/ai/tools/`
- Pattern: one file per tool, e.g. `create-service-request.tool.ts`

**Database:**
- Config: `src/database/database.config.ts`
- Migrations: `src/database/migrations/`
- Entities: co-located in each module's `entities/` folder
