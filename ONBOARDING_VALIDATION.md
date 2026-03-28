# Onboarding Validation Stack

This stack is an opt-in environment for the onboarding interview validation flow.

It is intentionally isolated from the default local development stack:

- dedicated compose file: `docker-compose.onboarding-validation.yaml`
- layered env loading: `api/.env`, `web/.env`, `.env.test`
- dedicated compose project name: `secretary-assistant-onboarding-validation`
- dedicated web/API ports: `4173` and `3300`
- dedicated database port: `55432`
- test-only auth mode enabled only in this stack
- same-origin browser API calls through the Vite `/api` proxy

## Why this exists

The onboarding validation flow creates real users, companies, and onboarding
conversation state. Reusing the default local stack would mix that state with
normal developer data and would require test auth behavior in the main API
process.

## Setup

1. Copy the env example:

```bash
cp .env.test.example .env.test
```

2. Add only the overrides the isolated test stack should apply.

```text
OPENAI_API_KEY
GOOGLE_API_KEY
```

The stack loads env in this order:

1. `api/.env`
2. `web/.env`
3. `.env.test`

`.env.test` is the override layer. Keep it small.

`OPENAI` is required for chat and transcription in the isolated API.
`GOOGLE` is still required while embeddings remain on Google.

The ports and isolated stack shape are fixed by the compose file:

- web: `4173`
- API: `3300`
- PostgreSQL: `55432`

The supported commands below always pass `--env-file .env.test`.

For the isolated web stack, `VITE_API_BASE_URL` stays at `/api` so browser
requests go through the Vite proxy to the isolated API container.

## Start the isolated stack

```bash
pnpm onboarding-validation:up
```

`up` performs the full setup path:

- removes the previous isolated stack and volumes
- rebuilds containers
- renews anonymous volumes
- starts the stack
- runs API migrations

## Run the onboarding validation flow

From the repo root:

```bash
pnpm onboarding-validation:test
```

This runs the dedicated onboarding validation Playwright config from `web/`,
not the default E2E suite. It targets the isolated onboarding-validation
web/API stack on `http://127.0.0.1:4173` and `http://127.0.0.1:3300`.

Recommended developer flow:

1. Keep your normal local stack running if you want; it can stay on `5173`,
   `3000`, and `5432`.
2. Run `pnpm onboarding-validation:up`.
3. Run `pnpm onboarding-validation:test`.
4. Inspect Playwright artifacts under `web/test-results/onboarding-validation/`
   if the validation fails.

## URLs

- Web: `http://localhost:4173`
- API: `http://localhost:3300`
- PostgreSQL: `localhost:55432`

## Stop the isolated stack

```bash
pnpm onboarding-validation:down
```
`down` removes the isolated containers and volumes.

## Scope

This environment is only for the onboarding validation flow. It does not
replace the default developer workflow in `README.md`.
