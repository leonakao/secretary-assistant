# Claude Code for Secretary Assistant

This repository uses Claude Code agent teams for coordinated development across the Secretary Assistant monorepo (API and web applications).

## Quick Start

**All agents working on this team must read the AGENTS.md file in the application/repository they are working on.**

Each application/repository has its own:
- `AGENTS.md` with application-specific instructions
- Documentation structure and guidelines
- Testing and development conventions
- Branch naming conventions

Start by:
1. Reading the `AGENTS.md` file in the application/repository you are assigned to
2. Reading [../README.md](../README.md) for project overview
3. Following that application's specific guidelines

## Agent Specialists

See [./agents/](./agents/) for individual agent role definitions:

- **product-owner.md** - Defines specifications (creates in `.specs/`, copies to each app)
- **architect.md** - Creates application-specific designs and task breakdowns
- **software-engineer.md** - Implements tasks (can spawn twice for parallel frontend + backend work)
- **code-reviewer.md** - Reviews code changes for quality and correctness
- **qa-tester.md** - Defines test scenarios and implements integration tests

## Agent Teams

See [./agent-teams/](./agent-teams/) for team configurations:

- **development-team.md** - Development Team setup with all specialists

## Workflow

For detailed workflow, approval gates, and coordination rules, see [./agent-teams/development-team.md](./agent-teams/development-team.md).

Key principles:
- **Agents work one application/repository at a time** and follow that application's AGENTS.md guidelines
- Product-owner creates specs outside applications first, then copies to each application/service
- **Product-owner can ask architect for help identifying which applications are affected**
- Architect designs per application/service (creates application-specific `design.md` and `tasks.md` in each repo)
- Software-engineer works one application/repository at a time (can spawn multiple times for parallel work)
- Code-reviewer reviews one application/repository at a time using that repo's standards
- QA-tester reads the testing guidelines for the application they are testing
- Deployment and merging are handled by repository workflows, not by agents
- **This structure scales**: works with 2 applications today, 10 microservices tomorrow
