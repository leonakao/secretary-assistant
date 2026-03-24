# Integrations

**Status:** Planned

## Backend API — Secretary Assistant API

**Transport pattern:**
- Shared wrapper: `app/lib/api.client.ts`
- All requests use `fetch` with `credentials: "include"` by default.
- Base URL resolution from runtime config (`VITE_API_BASE_URL`):
  - Relative path when unset (same-origin / Vite dev proxy)
  - Absolute prefix when set (staging/production)

**Dev proxy:**
- `vite.config.ts` proxies `/api` to `http://localhost:3000` during local development.
- `.env.example` sets `VITE_API_BASE_URL=/api`.

**Planned endpoints:**

- Auth/session:
  - `POST /auth/login`
  - `POST /auth/logout`
  - `GET /users/me`
- Agent configuration:
  - `GET /companies/:id` — load company/agent config
  - `PATCH /companies/:id` — update agent settings
- WhatsApp connection:
  - `GET /evolution/instances` — list WhatsApp instances
  - `POST /evolution/instances` — create/connect instance
- Conversations:
  - `GET /chat/conversations` — list conversations per contact
- Contacts:
  - `GET /contacts` — list contacts
  - `GET /contacts/:id` — contact detail
- Service requests:
  - `GET /service-requests` — list service requests
  - `PATCH /service-requests/:id` — update status

## Authentication Flow

1. Login UI collects owner credentials (TBD — email/password or Google).
2. Backend authenticates and sets HTTP cookie session.
3. Frontend bootstraps session with `GET /users/me`.
4. Protected routes redirect to `/login?redirectTo=...` when session is absent.

## Integration Boundaries in Code

- Endpoint wrappers are module-local under `app/modules/*/api/`.
- Cross-endpoint orchestration lives in `use-cases/`.
- Route modules consume use-cases/module APIs — no raw `fetch` calls in routes.
