# Tech Stack

**Status:** Active — minimal scaffold with home module
**Pattern:** Follows reference project conventions

## Core

- Framework: React Router Framework Mode + React 19 (SPA, `ssr: false`)
- Language: TypeScript (`strict: true`)
- Build Tool: Vite
- Runtime: Browser SPA
- Package manager: pnpm

## Frontend

- UI Framework: React + React Router route modules (`clientLoader` / `clientAction`)
- Styling: Tailwind CSS, class composition with `clsx` + `tailwind-merge` + `class-variance-authority`
- Component primitives: Shadcn UI (Radix-based, generated into `app/components/ui/base`)
- Icons: `lucide-react`
- State Management: In-memory + localStorage session state; React local state for page-level

## Backend Integration

- API Style: REST over `fetch` wrapper (`app/lib/api.client.ts`)
- Auth Approach: Backend HTTP cookie session as durable auth source (`credentials: "include"`)
- Base URL: configurable via `VITE_API_BASE_URL`; proxied via Vite dev server locally

## Testing

- Unit tests: Vitest
- Component tests: Testing Library (`@testing-library/react`, `@testing-library/jest-dom`) with jsdom
- Test bootstrap: `app/test/setup.ts`

## External Services

- Backend API: secretary-assistant API (`api/`)
- Assets/CDN: Google Fonts (planned)

## Development Tools

- Type checking: `react-router typegen && tsc`
- Build/serve: `react-router build`, `react-router-serve`
