# Feature Spec — Agent Policy Layer and Prompt Restructure

## Summary

Introduce a reusable policy layer and supporting agent nodes so critical workflow rules are enforced structurally instead of relying primarily on prompt instructions. At the same time, replace the current XML-like prompt builder format with a simpler, human-readable prompt structure that is easier to inspect, evolve, and reuse across agents.

This capability is cross-agent and must support the client, owner, and onboarding agents without hardcoding business rules into a single flow.
The feature scope also includes restructuring and standardizing the prompts used by those three agents so they follow the same architectural direction and can be reused or extended by future agents.

## Problem

The current agent architecture places too much behavioral responsibility on prompt text:

- prompt instructions encode business-critical workflow rules
- prompt instructions encode orchestration guidance that should live in nodes or tools
- memory usage depends heavily on the model following textual instructions
- the current prompt builder uses XML-like sections that add noise without delivering structural enforcement

This creates four main risks:

1. A model can ignore or partially follow critical workflow rules.
2. Agent behavior becomes fragile because operational changes require prompt edits instead of targeted flow changes.
3. Prompt observability becomes harder because prompts are verbose and visually noisy.
4. Reuse across agents becomes difficult because rules are mixed with persona and local prompt wording.

## Goals

- Reduce prompt responsibility to identity, tone, context, and minimal response guardrails.
- Standardize prompt structure across the client, owner, and onboarding agents.
- Introduce a reusable policy layer that can block or redirect unsafe or invalid agent actions.
- Support reusable flow components across multiple agents.
- Replace the XML-like prompt format with a simpler structure that is easier to inspect in LangWatch and easier to maintain.
- Make critical workflow rules enforceable without depending only on model obedience.
- Ensure the agent stays aligned with the actual scope of the represented company, especially in the client flow, guiding the conversation toward real products and services and declining out-of-scope requests.
- Preserve current agent capabilities and intended behaviors while improving prompt clarity, inspectability, and structural enforcement.

## Non-Goals

- Changing business rules unrelated to prompt structure or policy enforcement.
- Replacing all existing tools.
- Building a full generic workflow engine for every future agent scenario.
- Solving all memory quality problems in this feature.

## Affected Actors and Flows

### Actors

- Customer talking to the client agent
- Company owner or staff member talking to the owner agent
- Company owner completing onboarding with the onboarding agent
- Future agent variants that need reusable policy enforcement

### Affected Flows

- Client support flow
- Owner support and management flow
- Onboarding interview flow
- Tool-calling flows that perform business-critical actions

### Prompt Scope

The prompt restructuring and standardization effort in this feature explicitly covers:

- client agent prompt
- owner agent prompt
- onboarding agent prompt

The resulting prompt architecture should also make it practical to extend the same pattern to future agents without redefining the entire prompt organization from scratch.

## Desired Outcome

After this feature:

- prompts are shorter, simpler, and easier to inspect
- prompts for client, owner, and onboarding follow a shared structural pattern
- critical business rules are enforced in code through reusable policies or dedicated nodes
- multiple agents can reuse the same policy gate infrastructure with different policies
- the onboarding agent cannot finalize onboarding without explicit user confirmation
- future agents can adopt the same policy layer without coupling to the client flow
- agents retain behavioral capability parity with the current system, avoiding regressions in what they are able to do for supported flows

## Functional Requirements

### 1. Prompt Simplification

- The agent prompt format must no longer rely on XML-like wrappers.
- The prompt structure must remain readable to humans in logs and traces.
- The prompt structure must be standardized across the client, owner, and onboarding agents, while still allowing agent-specific sections where needed.
- The prompt must focus on:
  - role/persona
  - current context
  - current state
  - response style
  - minimal model-level safety instructions

### 2. Reusable Policy Gate

- The architecture must support a generic policy gate node that is reusable across agents.
- The policy gate must evaluate the agent’s intended action before protected actions are executed.
- The policy gate must support agent-specific policy registration without hardcoding all logic into the gate itself.
- A blocked action must produce structured feedback that helps the agent continue correctly.

### 3. Policy Scope

Policies must be able to enforce rules such as:

- explicit user confirmation required before onboarding finalization
- protected actions requiring a prior confirmation workflow
- prevention of invalid action sequencing
- prevention of business-critical action execution when required preconditions are missing

### 4. Cross-Agent Compatibility

- The same policy gate infrastructure must be usable by:
  - client agent
  - owner agent
  - onboarding agent
- Each agent must be able to register only the policies relevant to its own flow.

### 5. Context Preparation

- The architecture should support dedicated context-preparation nodes so prompts do not need to instruct the model to manually perform every context-fetching step.
- Context preparation must remain reusable and composable, not tied only to one agent.

### 6. Company Scope Alignment

- The agent must stay aligned with the actual products, services, and operational scope of the represented company.
- This requirement is especially important for the client agent, which must guide customer conversations toward what the company actually offers.
- When the customer asks for something outside the company scope, the agent must not pretend the company can provide it.
- In out-of-scope situations, the agent should clearly state that it cannot help with that request through the represented company and, when appropriate, redirect the conversation toward products or services the company actually offers.

## Business Rules

### Rule 1 — Onboarding Finalization Confirmation

- The onboarding agent must not finalize onboarding unless the user has explicitly confirmed that onboarding can be finalized.
- Ambiguous statements must not count as explicit confirmation.
- If the agent attempts to finalize without explicit confirmation, the action must be blocked and the agent must be instructed to ask for confirmation.

### Rule 2 — Protected Action Enforcement

- Any action classified as business-critical must be eligible for policy enforcement before execution.
- Protected actions may differ by agent and flow.
- Preconditions must be validated structurally, not only through prompt wording.

### Rule 3 — Agent-Specific Policy Composition

- Policies must be attachable per agent.
- A policy valid for onboarding must not automatically apply to unrelated flows unless explicitly configured.
- Shared policies must remain generic enough to be reused with different action names, preconditions, and remediation instructions.

### Rule 4 — Prompt Responsibility Boundaries

- Prompts may guide tone, language, and response style.
- Prompts must not be the only enforcement mechanism for business-critical sequencing rules.

### Rule 5 — Company Scope Boundaries

- The client-facing agent must answer within the operational scope of the current company.
- The agent must not imply that the company offers products or services that are not supported by the known company context.
- When a customer request is outside the company scope, the agent must:
  - clearly state that the company cannot help with that request
  - avoid hallucinating availability, pricing, process, or expertise for unsupported offerings
  - redirect the conversation to relevant offerings when a reasonable redirection exists
- If the company context is insufficient to determine whether a request is in scope, the agent may ask a clarifying question or state that it cannot confirm that offering.

## Edge Cases

- The user gives an indirect or vague onboarding completion response such as “acho que sim” or “pode ser”.
- The user changes their mind after previously indicating readiness to finalize.
- The agent reaches a protected tool call with incomplete context.
- A shared policy is attached to one agent but not another.
- A policy blocks an action and the agent needs actionable remediation to continue the conversation naturally.
- Multiple policies apply to the same candidate action.
- A future agent uses the shared policy layer but does not need memory hydration or confirmation logic.
- The customer asks for a product or service clearly unrelated to the company’s known offerings.
- The customer request partially overlaps with the company scope and requires redirection rather than a full refusal.
- The company description is broad, incomplete, outdated, or ambiguous, making scope classification uncertain.
- The customer insists on an out-of-scope request after the agent has already declined it.

## Acceptance Criteria

### Prompt Structure

- Prompts used by the client, owner, and onboarding agents no longer use XML-like section syntax.
- Prompt output is human-readable and materially shorter or clearer than the current format.
- Client, owner, and onboarding prompts share a standardized structure, with only agent-specific content varying where necessary.

### Company Scope Alignment

- The client agent keeps the conversation aligned with the known scope of the represented company.
- When a customer asks for something outside the company scope, the client agent does not claim the company can provide it.
- In out-of-scope situations, the client agent declines appropriately and, when possible, redirects the conversation toward relevant products or services the company actually offers.
- When company context is insufficient to determine scope, the agent behaves conservatively and does not invent offerings.

### Capability Parity / Non-Regression

- Simplifying and standardizing prompts must not reduce the set of supported agent behaviors in existing flows.
- Client, owner, and onboarding agents must remain able to perform the supported tasks they can perform today, while benefiting from clearer prompts and stronger structural enforcement.
- Any intentional behavior change must come from explicitly defined business rules or policy enforcement, not from accidental loss of capability caused by prompt simplification.

### Policy Layer

- A generic policy gate infrastructure exists and can be reused by more than one agent.
- Policies are registered per agent rather than hardcoded centrally for all flows.
- Blocked protected actions return feedback that allows the agent to recover gracefully.

### Onboarding Protection

- The onboarding agent cannot complete onboarding without explicit user confirmation.
- Attempting to do so results in a blocked action and a corrective next step.

### Architectural Separation

- Prompt text no longer carries sole responsibility for critical workflow enforcement.
- At least one critical workflow rule is enforced outside the prompt through the new policy mechanism.

### Forward Compatibility

- The resulting architecture supports adding new policies for future agents without redesigning the entire flow.
- The resulting prompt structure can be reused by future agents without reintroducing ad hoc formatting conventions.

## Risks

- Over-generalizing the policy layer too early may create unnecessary abstraction.
- Overly rigid policies may block legitimate agent behavior in edge cases.
- Moving rules from prompt to code may surface existing flow ambiguities that were previously hidden.
- Reusing generic policies across agents may create naming or semantic mismatches if action contracts are inconsistent.
- Prompt simplification may accidentally remove implicit behaviors that currently work, causing behavioral regression if capability parity is not validated explicitly.

## Compatibility and Evolution

- The policy mechanism should be designed as an extensible layer, not as a client-agent-specific rule set.
- New agents should be able to reuse the gate with their own policies, action matchers, and remediation behavior.
- Existing agents should be able to adopt the new infrastructure incrementally rather than through a single all-at-once migration.
- The new prompt architecture should preserve current supported capabilities even if the underlying prompt structure and enforcement model change.

## Open Questions for Design Phase

- What is the exact contract for a policy decision and how should blocked actions be represented in the graph?
- Should policy enforcement happen before tool execution, after tool planning, or both?
- Which context hydration steps should become reusable nodes versus remain explicit tool usage?
- What qualifies as explicit confirmation for onboarding finalization?
- Which current prompt instructions should remain as model guardrails versus move into nodes or tools?
