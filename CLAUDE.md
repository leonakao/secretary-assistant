# Claude Code Instructions

- Project-local Claude Code guidance lives under `.claude/`
- Read `.claude/README.md` before starting substantial subagent work in this repository
- In Claude Code subagent workflows, the main conversation should act as the `main-thread delivery-lead` coordinator
- Use project subagents from `.claude/agents/` as specialist roles chained from the main conversation
- Use `.claude/agent-teams/` as the project-local reference when you want a true Claude team lead with teammates
- After changing the Claude subagent workflow or roles, update `.specs/project/STATE.md`
