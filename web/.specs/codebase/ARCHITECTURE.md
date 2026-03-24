# Architecture

**Pattern:** Modular SPA with a thin route layer and feature modules
**Status:** Planned — follows reference project conventions

## High-Level Structure

Client-rendered SPA (`ssr: false`) using React Router Framework Mode.

Architecture layers:

1. **Route layer** (`app/routes`, `app/routes.ts`): URL mapping, loader/action orchestration, auth gating, layout wrappers.
2. **Feature layer** (`app/modules/*`): domain logic, endpoint wrappers, use-cases, and feature UI.
3. **Shared layer** (`app/lib`, `app/components`, `app/hooks`): runtime config, HTTP client, shared UI primitives, cross-feature hooks.

Shared UI is further split:

1. **Vendor layer** (`app/components/ui/base`): generated Shadcn primitives — treat as immutable vendor code.
2. **Design-system atom layer** (`app/components/ui`): product wrappers around vendor primitives.
3. **Shared molecule layer** (`app/components`): reusable compositions of two or more atoms.
4. **Layout and shell layer** (`app/components/layout`): higher-level layout components consumed from modules.

## Identified Patterns

### Thin Route Orchestration

**Location:** `app/routes/*`
**Purpose:** Keep route modules focused on request/response orchestration and rendering feature pages.
**Implementation:** Route files call module APIs/use-cases in `clientLoader`/`clientAction`, perform the initial page data fetch, and return serialized data to page components.

### Loader-First Page Data

**Location:** `app/routes/*` + feature module page props
**Purpose:** Route loader owns first-render data so pages render from resolved state, not after-mount fetches.
**Implementation:**
1. `clientLoader` fetches the data required for first render.
2. Loaders delegate to module APIs/use-cases — no inline domain logic.
3. Page components receive loader-shaped props and compose UI from that data.
4. Client hooks may refresh state after first render but must be initialized from loader data.

### Layout Route Grouping

**Location:** `app/routes/_auth.tsx`, `app/routes/_protected.tsx`, `app/routes.ts`
**Purpose:** Apply route-group concerns once (access control, shared layout shell, navigation).
**Implementation:** Protected layout validates session and redirects; layout routes compose URL branches.

### Feature Module Encapsulation

**Location:** `app/modules/<feature>/...`
**Purpose:** Isolate domain behavior by feature boundary.
**Implementation:**
- `api/`: endpoint wrappers + endpoint-local contracts
- `use-cases/`: multi-call orchestration + view model mapping
- `components/`: reusable module-level UI
- `pages/[page-name]/index.tsx`: page entry point
- `pages/[page-name]/components/`: page-private UI (promote to module `components/` if reused)

### Shared HTTP Boundary

**Location:** `app/lib/api.client.ts`
**Purpose:** Centralize API URL resolution and credential policy.
**Implementation:** All module APIs call `fetchApi`/`fetchApiResponse`; wrappers resolve base URL and include credentials by default.

### Session Bootstrap

**Location:** `app/modules/auth/session.ts` + protected route loaders
**Purpose:** Keep auth state consistent when parent/child loaders run concurrently.
**Implementation:** `bootstrapAuthSession()` deduplicates in-flight requests with a shared promise; supports forced refresh.

## Data Flow

### Authentication Flow

1. Login UI collects credentials.
2. Token exchanged with backend API (`POST /auth/login`).
3. Session bootstrap (`GET /users/me`) resolves authenticated state.
4. Protected routes check session and redirect to `/login?redirectTo=...` when unauthenticated.

### Protected Page Flow

1. Protected layout loader validates session.
2. Page-specific loader fetches initial data via module use-cases.
3. Use-cases map backend payloads to view models before rendering.

### Planned Feature Flows

- **Agent configuration:** owner sets up agent personality, WhatsApp connection
- **Conversation history:** view incoming/outgoing messages per contact
- **Service requests:** list and manage active service requests
- **Contacts:** view and manage WhatsApp contacts

## Module Boundaries

- Routes must not contain endpoint contract parsing or domain mapping logic.
- Routes own the initial page data fetch through loaders.
- Module `api/` files must not orchestrate unrelated feature flows.
- Use-cases are the main composition boundary for multi-endpoint and domain transformations.
- The intended dependency direction is `ui/base` → `ui` → shared `components` → `components/layout` → `modules/*` → `routes/*`.
- Reverse imports (lower layer importing from higher layer) are not allowed.

## Styling System

- Tailwind utility classes are the default styling mechanism.
- Hard-coded values should be avoided in favor of design tokens.
- Theme support required for both light and dark mode.
- Application color tokens defined centrally in `app/app.css`.

## Related Docs

- Stack and dependency inventory: `.specs/codebase/STACK.md`
- Naming/coding conventions: `.specs/codebase/CONVENTIONS.md`
- Directory/file map: `.specs/codebase/STRUCTURE.md`
- Test strategy: `.specs/codebase/TESTING.md`
- External integration contracts: `.specs/codebase/INTEGRATIONS.md`
