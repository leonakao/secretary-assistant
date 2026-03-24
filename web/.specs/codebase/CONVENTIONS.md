# Code Conventions

**Status:** Planned — follows reference project conventions

## Naming Conventions

**Files:**
- `kebab-case` for all files and directories.
- `index.tsx` used as entry point for route/page/component folders when structure grows.
- Examples: `app/modules/agent/use-cases/load-agent-config.ts`, `app/modules/conversations/pages/conversation-page/index.tsx`

**Functions/Methods:**
- `camelCase` for functions and hooks.
- Hooks prefixed with `use`.
- Examples: `bootstrapAuthSession`, `useAgentConfig`, `loadConversationHistory`

**Types/Interfaces:**
- `PascalCase` for interfaces/types.
- Suffixes indicate role: `Input`, `Response`, `Result`, `Props`.
- Examples: `AgentConfigApiResponse`, `ConversationRouteLoaderData`, `ServiceRequestResult`

**Constants:**
- `SCREAMING_SNAKE_CASE` for module constants/messages.
- Examples: `DEFAULT_AGENT_ERROR_MESSAGE`, `MAX_MESSAGE_LENGTH`

## Code Organization

**Import style/order:**
- External imports first, then internal `~/...`, then local relative imports.
- Type imports separated with `import type`.

**Layering boundaries:**
- Routes orchestrate loaders/actions, own the initial page fetch, render module pages.
- Module `api/` files wrap backend endpoints.
- Module `use-cases/` compose endpoint calls + mapping.
- Shared infra in `app/lib`.
- Shared UI dependencies follow the component layer hierarchy.

## Loader Conventions

- Fetch initial page data in the route `clientLoader`.
- Loaders delegate domain work to module APIs/use-cases — no inline business logic.
- Loader return types define the page's initial render contract.
- Page components receive loader data through props and compose from that state first.
- Client hooks manage post-render refreshes/retries/local state — initialized from loader data when a loader exists.
- Reusable components must not become hidden first-fetch entry points for route-backed pages.

## Component Conventions

**Global component layers:**
- `app/components/ui/base` — vendor layer, generated Shadcn primitives. **Do not edit.**
- `app/components/ui` — design-system atom layer. Wrap/adapt `ui/base` here for product-specific behavior.
- `app/components` — shared molecule layer. Components composed from two or more atoms.
- `app/components/layout` — layout/shell components, consumed only from inside modules.

**Module component organization:**
- `app/modules/[domain]/components` — reusable across pages in the module; may be imported by other modules.
- `app/modules/[domain]/pages/[page-name]/components` — private to one page; promote to module `components/` if reused.
- Components are imported directly by consumers — prop injection is an exception, not the default.

**Component naming:**
- Use `[context-name]Section` components when a page has distinct content contexts (e.g. `AgentConfigSection`).
- Directory names in `kebab-case`; exported component in `PascalCase`.
- Simple pages do not need `Section` components when the extra abstraction adds no clarity.

**Component creation:**
- Public API lives directly under the owning `components` directory.
- Single-file: `components/[component-name].tsx`.
- Multi-file: expose public API as `components/[component-name].tsx`, internals in `components/[component-name]/`.
- Internals (subcomponents, hooks, utils) inside the subfolder are private — never import them directly from outside.
- Keep one component per file.
- Unit test colocated: `components/agent-config-section.tsx` + `components/agent-config-section.test.tsx`.

## Dependency Rules

- Never import in reverse (lower layer importing from higher layer).
- Expected direction: `ui/base` → `ui` → shared `components` → `components/layout` → `modules/*` → `routes/*`.
- Data-flow: `route loader` → `module use-case/api` → `page props` → `page/section components` → optional post-render hook refresh.

## Type Safety

- TypeScript strict mode enabled.
- API wrappers define request/response contracts in the same file.
- Runtime guards used for uncertain payloads before mapping to typed models.

## Error Handling

- API calls return discriminated result objects for expected auth/business states.
- Unexpected failures caught and normalized to user-safe messages.
- Invariant violations may throw explicitly in loaders.

## Export Conventions

- Named exports preferred in modules/lib.
- Default exports used mainly for route module components.

## Comments and Documentation

- Comments are sparse, used only for non-obvious behavior.

## Test Conventions

- Test files colocated as `*.test.ts` / `*.test.tsx` beside the file under test.
- `vi.mock(...)` + `vi.mocked(...)` for dependencies.
- Reset mocks in `beforeEach`.
- Behavior-driven test names: `it('returns error result when API is unreachable', ...)`.

## Styling Rules

- Prefer Tailwind utility classes; avoid hard-coded values when a token/semantic utility exists.
- Components must support both dark and light themes.
- Keep styling centralized inside components.
- Pages focus on composition and layout, not re-implementing component visuals.
- Application color tokens live in `app/app.css`.
