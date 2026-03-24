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
| `EVOLUTION_API_KEY` | Shared with Evolution API service |
| `EVOLUTION_API_URL` | Evolution API base URL (default: `http://evolution-api:8080`) |
| `EVOLUTION_API_TOKEN` | Webhook security token for Evolution API callbacks |

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
docker compose exec app pnpm migration:run
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

## Tech stack

- **Backend** — [NestJS](https://nestjs.com/), PostgreSQL with [pgvector](https://github.com/pgvector/pgvector), TypeORM, LangGraph + Google Gemini
- **Frontend** — React 19, React Router, Tailwind CSS, shadcn/ui
- **WhatsApp integration** — [Evolution API](https://github.com/EvolutionAPI/evolution-api)
