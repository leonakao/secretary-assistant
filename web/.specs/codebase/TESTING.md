# Testing

**Status:** Planned — follows reference project conventions

## Test Stack

- Test runner: Vitest
- DOM environment: `jsdom`
- Component assertions/rendering: Testing Library (`@testing-library/react`, `@testing-library/jest-dom`)
- Shared setup: `app/test/setup.ts` (cleanup after each test)

Configured in:
- `vite.config.ts` → `test.environment`, `test.include`, `test.setupFiles`

## Test Execution

```bash
pnpm test        # vitest run
pnpm test:watch  # watch mode
pnpm test:cov    # coverage
```

## What to Test

### API wrapper and contract tests
- Endpoint invocation and query-string building
- Response payload validation / parsing failures
- Error propagation and normalization
- Examples: `app/modules/agent/api/get-agent-config.test.ts`, `app/modules/conversations/api/list-conversations.test.ts`

### Use-case orchestration tests
- Multi-call orchestration behavior
- Mapping from API data to view models
- Examples: `app/modules/agent/use-cases/load-agent-config.test.ts`

### Hook/component behavior tests
- Hook state transitions under mocked dependencies
- Conditional rendering behavior
- Examples: `app/modules/agent/pages/agent-config-page/components/whatsapp-connection-section.test.tsx`

### Runtime config tests
- Environment variable handling and URL composition
- Example: `app/lib/runtime-config.client.test.ts`

## Testing Conventions

- Tests colocated with source files as `*.test.ts` / `*.test.tsx`.
- `vi.mock()` + `vi.mocked()` to isolate unit boundaries.
- Mock reset in `beforeEach`.
- Behavior-driven scenario names: `it('returns error result when agent config is not found', ...)`.

## Gaps / Recommendations

- No E2E test suite planned for v1 — add smoke tests once core flows are stable.
- Add route-level integration tests for protected navigation and redirect behavior.
- Add CI coverage thresholds once test suite is established.
