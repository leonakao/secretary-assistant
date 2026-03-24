# Project Structure

**Status:** Active — minimal scaffold with home module
**Root:** `secretary-assistant/web/`

## Directory Tree

```text
web/
├── app/
│   ├── components/              # shared UI (atoms, molecules, layout, vendor)
│   │   ├── ui/
│   │   │   └── base/            # Shadcn generated primitives — do not edit
│   │   └── layout/              # shell/layout components
│   ├── hooks/                   # shared hooks
│   ├── lib/                     # API client, runtime config, utilities
│   │   └── api.client.ts
│   ├── modules/                 # feature modules
│   │   ├── auth/
│   │   ├── agent/
│   │   ├── conversations/
│   │   ├── contacts/
│   │   └── service-requests/
│   ├── routes/                  # React Router route modules/layouts
│   │   ├── _auth.tsx
│   │   ├── _protected.tsx
│   │   └── dashboard.tsx
│   ├── test/                    # shared test bootstrap
│   │   └── setup.ts
│   ├── app.css
│   ├── root.tsx
│   └── routes.ts
├── public/
├── .specs/
│   └── codebase/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── react-router.config.ts
```

## Module Organization

### Routes Layer (`app/routes`)

**Purpose:** URL mapping, loader/action orchestration, auth gating, layout wrappers.
**Key files (planned):**
- `app/routes/_auth.tsx` — unauthenticated layout
- `app/routes/_protected.tsx` — session validation + redirect guard
- `app/routes/dashboard.tsx` — main dashboard after login
- `app/routes/agent/index.tsx` — agent configuration page

### Feature Modules (`app/modules`)

**Purpose:** Business features split by domain.

**Planned modules:**
- `auth` — login, session bootstrap, auth state
- `agent` — agent configuration (personality, WhatsApp connection)
- `conversations` — conversation history per contact
- `contacts` — WhatsApp contact management
- `service-requests` — service request listing and management

**Module folder contract:**
- `app/modules/[domain]/api/` — endpoint wrappers + response contracts
- `app/modules/[domain]/use-cases/` — multi-endpoint orchestration + view model mapping
- `app/modules/[domain]/components/` — reusable module-level UI; may be imported by other modules
- `app/modules/[domain]/pages/[page-name]/index.tsx` — page entry point
- `app/modules/[domain]/pages/[page-name]/components/` — page-private UI; promote if reused

### Shared Infrastructure (`app/lib`, `app/components`, `app/hooks`)

**Purpose:** Cross-cutting utilities and UI.
**Key files (planned):**
- `app/lib/api.client.ts` — fetch wrapper with credentials + base URL resolution
- `app/lib/runtime-config.client.ts` — env var resolution
- `app/components/page-surface.tsx` — common page wrapper

### Global Component Layers (`app/components`)

- `app/components/ui/base` — Vendor Layer: Shadcn generated primitives. **Do not edit.**
- `app/components/ui` — Design System Atom Layer: product wrappers around `ui/base`.
- `app/components` — Shared Molecule Layer: components composed from two or more atoms.
- `app/components/layout` — Layout/shell components; consumed only from inside modules.

## Where Things Live

**Auth/session:**
- API wrappers: `app/modules/auth/api/`
- Session state: `app/modules/auth/session.ts`
- Login page: `app/modules/auth/pages/login/`

**Agent configuration:**
- API wrappers: `app/modules/agent/api/`
- Use-cases: `app/modules/agent/use-cases/`
- Page UI: `app/modules/agent/pages/agent-config-page/`

**Conversations:**
- API wrappers: `app/modules/conversations/api/`
- Page UI: `app/modules/conversations/pages/conversation-page/`

**Testing:**
- Colocated tests: `app/**/*.test.ts`, `app/**/*.test.tsx`
- Global test setup: `app/test/setup.ts`
