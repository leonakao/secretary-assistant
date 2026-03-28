# Onboarding Validation Stack

This stack is an opt-in environment for the onboarding interview validation flow.

It is intentionally isolated from the default local development stack:

- dedicated compose file: `docker-compose.onboarding-validation.yaml`
- dedicated env file: `.env.onboarding-validation`
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
cp .env.onboarding-validation.example .env.onboarding-validation
```

2. Fill in at least:

```text
ONBOARDING_VALIDATION_GOOGLE_API_KEY
```

The remaining values have safe local defaults for the isolated stack.

Key isolation knobs in `.env.onboarding-validation`:

- `ONBOARDING_VALIDATION_COMPOSE_PROJECT_NAME`
- `ONBOARDING_VALIDATION_WEB_PORT`
- `ONBOARDING_VALIDATION_API_PORT`
- `ONBOARDING_VALIDATION_DB_PORT`
- `ONBOARDING_VALIDATION_VITE_API_BASE_URL`
- `ONBOARDING_VALIDATION_VITE_AUTH0_APP_ORIGIN`
- `ONBOARDING_VALIDATION_BASE_URL`
- `ONBOARDING_VALIDATION_API_BASE_URL`

The supported commands below always pass `--env-file .env.onboarding-validation`
so Compose interpolation and container runtime env stay aligned.

For the isolated web stack, `ONBOARDING_VALIDATION_VITE_API_BASE_URL` should stay
at `/api` so browser requests go through the Vite proxy to the isolated API
container. Do not point the browser directly at `http://localhost:3300` unless
the app is updated to handle CORS explicitly.

## Start the isolated stack

```bash
pnpm onboarding-validation:up
```

Run API migrations against the isolated API container:

```bash
pnpm onboarding-validation:migrate
```

## Run the onboarding validation flow

From the repo root:

```bash
pnpm onboarding-validation:test
```

This runs the dedicated onboarding validation Playwright config from `web/`,
not the default E2E suite. It targets the isolated onboarding-validation
web/API base URLs defined in `.env.onboarding-validation`.

Recommended developer flow:

1. Keep your normal local stack running if you want; it can stay on `5173`,
   `3000`, and `5432`.
2. Start the isolated onboarding-validation stack on `4173`, `3300`, and
   `55432`.
3. Run `pnpm onboarding-validation:test`.
4. Inspect Playwright artifacts under `web/test-results/onboarding-validation/`
   if the validation fails.

If you need live service output while debugging:

```bash
pnpm onboarding-validation:logs
```

## URLs

- Web: `http://localhost:4173`
- API: `http://localhost:3300`
- PostgreSQL: `localhost:55432`

## Stop the isolated stack

```bash
pnpm onboarding-validation:down
```

To also remove the isolated database volume:

```bash
pnpm onboarding-validation:down:volumes
```

## Scope

This environment is only for the onboarding validation flow. It does not
replace the default developer workflow in `README.md`.
