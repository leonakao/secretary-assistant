# Conventions

## Code Style
- **Prettier**: single quotes, trailing commas.
- **ESLint**: typescript-eslint recommendedTypeChecked.

## TypeScript
- **Strict mode enabled** (`strict: true`).
- **Decorator metadata** enabled for NestJS.

## Environment Variables
- Use `.env` locally (ignored by git), `.env.example` for documentation.
- DB variables: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`.

## Migrations & Seeds
- **IMPORTANTE**: Migrations devem ser executadas **dentro do container Docker** (`docker compose exec api sh`).
- Use TypeORM CLI scripts from `package.json`.
- Prod: build first (`pnpm build`), then run `pnpm migration:run` against compiled JS.

## Module Architecture
- `src/modules` contains one folder per domain.
- `src/database` contains database configuration, migrations, and naming strategies.
- `src/modules/monitor` contains cross-cutting observability (global exception filter, logger middleware).

### Module Exports
- **Exporte apenas services** que serão utilizados por outros módulos
- **Não exporte TypeORM** (entidades, repositories)
- **Não exporte use cases** - são internos ao módulo
- **Exporte guards** apenas se forem utilizados por outros módulos (ex: InternalApiGuard)
- **Exporte utilities** compartilhadas quando necessário

### Controllers
- REST controllers + **Single Action Controllers** for specific actions.
- **Controller naming by scope**:
  - `/me` endpoints → `{entity}-me.controller.ts`
  - `/internal` endpoints → `{entity}-internal.controller.ts`
  - `/admin` endpoints → `{entity}-admin.controller.ts`
- Internal endpoints require authentication via `InternalApiGuard`

### Use Cases
- Only invoked by controllers.
- 1:1 relationship with a controller action.
- Each use-case exposes a single public method: `execute()`.
- Use cases are domain-specific, not prefixed with "internal" unless necessary

### Repositories
- Usar repositórios do TypeORM diretamente (sem classes de repository customizadas)

### Services
- Encapsulate logic shared by multiple use-cases.
- Each service exposes a single public method: `execute()`.

### Guards
- Internal API authentication via `InternalApiGuard` (localizado no módulo Auth)
- Token validation using `INTERNAL_API_TOKEN` environment variable
- Header name: `X-Internal-Token`
- Authentication guards should live in the relevant auth module

### DTOs
- Must handle validation + normalization/formatting.
- Use `class-validator` and `class-transformer`.
- Use-cases receive fully prepared data; no extra parsing inside use-cases.
- Each DTO should define input/output TypeScript interfaces for data shapes.
- Avoid response DTO classes; prefer output interfaces returned by use-cases/controllers.

## File Naming
- Nest modules/controllers/services follow `*.module.ts`, `*.controller.ts`, `*.service.ts`.
- TypeORM entities: `*.entity.ts`.
- Migrations in `src/database/migrations`.
- Guards: `*.guard.ts`.
- Internal controllers: `{entity}-internal.controller.ts`.

## Error Handling

### Global Error Handler
- A aplicação possui um handler global de erros que captura e trata exceções
- **Evite `try...catch`** em controllers e use cases sempre que possível
- Use `try...catch` apenas quando necessário para tratamento específico
- Deixe o handler global tratar a maioria das exceções

### Controllers
- **Não use try/catch** em controllers
- Deixe exceções propagarem para o handler global
- Foque na lógica de negócio, não em tratamento de erros

### Use Cases
- Use `try...catch` apenas quando necessário para tratamento específico
- Para erros de banco ou validação, deixe o handler global tratar
- Adicione tratamento específico apenas para casos de borda críticos

### Services
- Mesma diretriz: evite `try...catch` desnecessários
- Use apenas para tratamento de erro que não pode ser generalizado

## Database Conventions
- Tabelas em **snake_case**, **lowercase** e **plural**.
- Não criar enums no banco de dados; enums apenas no código.
- **Soft Deletes**: TypeORM lida automaticamente com `deletedAt` em queries
- **Não adicione `deletedAt: IsNull()`** manualmente - TypeORM faz isso automaticamente

## Testing Strategy

### Unit Tests - Priority Components
- **Use Cases**: Test business logic, edge cases, and error handling
- **Services**: Test shared logic and complex operations
- **Guards**: Test authentication and authorization flows
- **Utils**: Test utility functions and helpers
- **Custom Validators**: Test validation logic with various inputs

### Components Without Unit Tests
- **DTOs**: Simple validation decorators tested by framework
- **Controllers**: Simple HTTP routing tested by integration tests
- **Entities**: Simple data structures tested by database operations
- **Modules**: Simple dependency injection tested by application startup

### Integration Tests
- Test complete flows through controllers
- Test database operations and constraints
- Test authentication flows with real tokens
- Test API endpoints with various scenarios

### E2E Tests
- Test critical user journeys
- Test cross-module interactions
- Test error scenarios and edge cases
