# Testing Infrastructure

## Test Frameworks

**Unit/Integration:** Vitest 3.x + unplugin-swc (SWC compilation)
**HTTP testing:** supertest 7.x
**Coverage:** @vitest/coverage-v8

## Test Organization

**Location:** Co-located with source files (`**/*.spec.ts`)
**Naming:** `<name>.spec.ts` next to the file under test
**Config:** `vitest.config.ts` at `api/` root

## Test Execution

```bash
pnpm test          # run all tests (vitest run)
pnpm test:watch    # watch mode
pnpm test:cov      # coverage report (text + json + html)
pnpm test:ui       # Vitest UI
```

## Configuration

- **globals: true** — no need to import `describe`/`it`/`expect`
- **environment: node**
- **Path alias:** `@` → `./src`
- **SWC plugin** for fast TypeScript compilation during tests
- Coverage excludes: `node_modules/`, `dist/`, `test/`, `*.spec.ts`, `*.config.ts`

## Testing Patterns (from CONVENTIONS.md)

### Priority components to unit test
- Use Cases — business logic and edge cases
- Services — shared logic
- Tools — AI tool logic
- Guards — auth flows
- Utils / custom validators

### Components without unit tests
- DTOs — validation tested by framework
- Controllers — tested via integration/HTTP tests
- Entities — tested by DB operations
- Modules — tested at startup

## Current State

- No test files observed in existing module directories (most module subdirs are empty — active development)
- Vitest infrastructure is fully configured and ready
- Integration tests should run against real infra: `docker compose up -d` → apply migrations → `pnpm test`

## Integration Test Architecture (planned)

### Goals
- Keep each `it(...)` focused on business behavior, not infrastructure wiring.
- Centralize repetitive setup/teardown.
- Reuse deterministic fixtures and domain-specific HTTP clients.

### Principles
- **Scenario first**: arrange → act → assert for a business rule.
- **One abstraction level per block**: avoid mixing raw SQL, HTTP calls, and domain assertions in the same block.
- **Use direct DB access only** for setup/reset/assertions not expressible via public APIs.
- **Cleanup must be deterministic**: unique identifiers or explicit teardown per scenario.

### Layers (to be established as codebase grows)

1. **Suite bootstrap** — shared env setup per spec file (`beforeAll`/`afterAll`)
2. **Domain clients** — HTTP helpers that hide URL/header/parsing boilerplate
3. **Fixtures** — deterministic data creation helpers
4. **Reset helpers** — explicit teardown/state reset between scenarios

### Naming convention
- Describe business behavior: `it('creates a service request when client sends a valid message', ...)`
- Avoid: `it('should call endpoint and verify response body', ...)`
