## Project Context

**Secretary Assistant** is a webapp that lets small business owners configure and deploy a personal AI secretary agent integrated with their WhatsApp account, enabling automated customer support.

Monorepo structure:

- **api/** — NestJS backend: AI agents, WhatsApp integration, service request management
- **web/** — React SPA: dashboard for configuring and managing the agent (planned)

Each application has its own `AGENTS.md` with application-specific instructions.

## Documentation Instructions

Start here when working on this project:

1. Read [README.md](README.md) for a quick overview of the project
2. Read [.specs/project/PROJECT.md](.specs/project/PROJECT.md) for detailed project description, goals, and scope
3. Read [.specs/project/STATE.md](.specs/project/STATE.md) for current project state and decisions
4. Read [.specs/project/ROADMAP.md](.specs/project/ROADMAP.md) for milestones and planned features
5. Then read the relevant application's `AGENTS.md` for development instructions:
   - API: [api/AGENTS.md](api/AGENTS.md)
   - Web: [web/AGENTS.md](web/AGENTS.md)

## Running the Project

```bash
# Start all services (API + DB + Evolution API)
docker compose up -d

# Run migrations
docker compose exec api pnpm migration:run
```

See [README.md](README.md) for full setup instructions.

