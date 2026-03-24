# Claude Agent Teams

This directory contains project-local guidance for running Claude Code agent teams in this repository.

## Why this exists

Claude subagents are enough for chained specialist work, but they do not create a true in-Claude orchestrator. Agent teams do.

According to the Claude Code docs:

- one session acts as the lead
- teammates work independently in their own contexts
- teammates can communicate directly
- only the lead can manage the team
- no nested teams

Docs:

- Subagents: https://code.claude.com/docs/en/sub-agents
- Agent teams: https://code.claude.com/docs/en/agent-teams

## Enable agent teams

Agent teams are experimental and disabled by default. Enable them by setting `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in Claude Code settings or your shell environment.

The docs state the local team config is stored at:

- `~/.claude/teams/{team-name}/config.json`

That file is outside this repository, so this directory stores versioned prompts and guidance rather than the runtime config itself.

## Delivery Lead Team

Use [development-team.md](./development-team.md) as the starter prompt for creating a delivery-oriented team.

Use this team as the default entrypoint for:

- new features
- implementation tasks
- planning work
- bugfixes
- review and QA follow-up loops

Recommended team:

- lead: delivery-lead
- teammates:
  - product-owner
  - architect
  - software-engineer
  - code-reviewer
  - qa-tester

The lead should engage teammates selectively by phase instead of creating ad hoc teams per request.

## Team Rules

- Follow the same approval gate defined in `.claude/README.md`
- The lead validates scope with the user before implementation
- The lead uses this team as the standard starting point for new delivery work
- Route structural findings to `architect`
- Route local implementation findings to `backend-engineer`
- Keep teammate ownership disjoint to avoid file conflicts
- Start with research and review before parallel code changes
