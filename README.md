# Secretary Assistant

A webapp that lets you configure and deploy a personal AI secretary agent integrated with your WhatsApp account. The agent handles incoming messages on your behalf, enabling small business owners to automate customer support without manual intervention.

## How it works

1. **Configure your agent** — Set up your assistant's personality, knowledge base, and response rules through the web dashboard.
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
- [Node.js](https://nodejs.org/) >= 24 (for local development)

### Environment setup

Copy the example env files and fill in the required values:

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env
```

Key variables to set in `api/.env`:

| Variable | Description |
|---|---|
| `GOOGLE_API_KEY` | Google Gemini API key |
| `EVOLUTION_API_KEY` | API key used by the NestJS app when calling Evolution |
| `AUTHENTICATION_API_KEY` | API key expected by the Evolution API container; set it equal to `EVOLUTION_API_KEY` in local Docker setups |
| `EVOLUTION_API_URL` | Evolution API base URL (default: `http://evolution-api:8080`) |
| `EVOLUTION_API_TOKEN` | Webhook security token for Evolution API callbacks |

For the default Docker stack, `api/.env` must include both `EVOLUTION_API_KEY`
and `AUTHENTICATION_API_KEY` with the same value. The API uses
`EVOLUTION_API_KEY` for outbound requests, while the Evolution container reads
`AUTHENTICATION_API_KEY` directly from the same env file.

Key variables to set in `web/.env`:

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | API base URL — use `/api` for local dev, `http://localhost:3000` for Docker |

### Running the full project (Docker)

Start all services — API, web, database, and Evolution API:

```bash
docker compose up -d
```

Then run database migrations:

```bash
docker compose exec api pnpm migration:run
```

| Service | URL |
|---|---|
| Web dashboard | http://localhost:5173 |
| API | http://localhost:3000 |
| Evolution API | http://localhost:8080 |
| PostgreSQL | localhost:5432 |

### Running locally (development)

Start the database and Evolution API via Docker, then run the API and web separately:

```bash
# Start infrastructure only
docker compose up -d db evolution-api

# API
cd api
pnpm install
pnpm migration:run
pnpm start:dev

# Web (separate terminal)
cd web
pnpm install
pnpm dev
```

### Stopping services

```bash
docker compose down
```

To also remove volumes (database data):

```bash
docker compose down -v
```

## Onboarding validation stack

Use the isolated onboarding-validation stack when you want to run the
automated onboarding interview flow without conflicting with your normal local
environment.

This stack is opt-in and separate from the default developer workflow:

- dedicated compose file: `docker-compose.onboarding-validation.yaml`
- layered env loading: `api/.env`, `web/.env`, `.env.test`
- dedicated compose project name: `secretary-assistant-onboarding-validation`
- dedicated ports: web `4173`, API `3300`, PostgreSQL `55432`
- test-only auth mode enabled only inside the isolated stack
- web API calls stay same-origin through the Vite `/api` proxy

Setup:

```bash
cp .env.test.example .env.test
```

Add only the overrides the isolated stack should apply. The most likely ones are:

- `OPENAI_API_KEY`
- `GOOGLE_API_KEY`

Start the isolated stack:

```bash
pnpm onboarding-validation:up
```

`up` rebuilds the isolated containers, clears volumes, and runs API migrations.

Run the onboarding validation flow:

```bash
pnpm onboarding-validation:test
```

Stop and clean the isolated stack:

```bash
pnpm onboarding-validation:down
```

This root command invokes the dedicated onboarding validation Playwright config
only, not the default E2E suite.

See [ONBOARDING_VALIDATION.md](ONBOARDING_VALIDATION.md) for the full workflow and port/env details.

## Tech stack

- **Backend** — [NestJS](https://nestjs.com/), PostgreSQL with [pgvector](https://github.com/pgvector/pgvector), TypeORM, LangGraph + OpenAI chat models, Google embeddings
- **Frontend** — React 19, React Router, Tailwind CSS, shadcn/ui
- **WhatsApp integration** — [Evolution API](https://github.com/EvolutionAPI/evolution-api)
