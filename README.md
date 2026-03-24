# Secretary Assistant

A webapp that lets you configure and deploy a personal AI secretary agent integrated with your WhatsApp account. The agent handles incoming messages on your behalf, enabling small business owners to automate customer support without manual intervention.

## How it works

1. **Configure your agent** — Set up your assistant's personality, knowledge base, and response rules through the web interface.
2. **Connect WhatsApp** — Link your WhatsApp account via the [Evolution API](https://github.com/EvolutionAPI/evolution-api) integration.
3. **Automate support** — Your agent reads incoming WhatsApp messages and responds automatically based on your configuration.

## Monorepo structure

```
.
├── api/   # NestJS backend — agent logic, WhatsApp integration, database
└── web/   # React SPA — dashboard for configuring and managing your agent
```

## Getting started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [pnpm](https://pnpm.io/installation)

### Running with Docker

```bash
docker-compose up
```

This starts the API (`localhost:3000`), the database (PostgreSQL + pgvector), and the Evolution API (`localhost:8080`).

### Running locally

```bash
# API
cd api
pnpm install
pnpm run start:dev

# Web (once scaffolded)
cd web
pnpm install
pnpm run dev
```

## Tech stack

- **Backend** — [NestJS](https://nestjs.com/), PostgreSQL with [pgvector](https://github.com/pgvector/pgvector), TypeORM
- **Frontend** — React (SPA)
- **WhatsApp integration** — [Evolution API](https://github.com/EvolutionAPI/evolution-api)
