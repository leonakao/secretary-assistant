# Centralized LLM Model Factory

## Summary

The codebase should select chat models through one centralized factory instead of creating provider-specific model instances inline throughout the application.

- Every LLM call site should obtain its model through `getLlmModel(type: 'helper' | 'user-interaction')`
- Chat-model swaps should become a one-file change for model selection
- LangChain remains the abstraction layer used by the application
- The first planned model mapping is `gpt-5-mini` for user interaction and `gpt-5-nano` for helper tasks

## Problem

The repository currently creates chat models directly in multiple places, with provider-specific implementation details repeated across the AI module.

This creates several problems:

- changing the primary model requires touching many files
- provider choice leaks into feature code that should only care about model purpose
- helper and user-facing interactions cannot be managed consistently from one place
- future model experiments are slower and riskier than necessary

## Goal

Make chat-model selection centralized, simple, and purpose-driven so the team can change model assignments in one file without rewriting call sites across the codebase.

## In Scope

- A centralized chat-model factory with the public shape `getLlmModel(type: 'helper' | 'user-interaction')`
- Refactoring chat-model call sites so they use the factory instead of constructing provider-specific models directly
- Two usage categories for chat models:
  - `user-interaction`
  - `helper`
- Configuration of which chat model each category uses
- Support for the planned initial mapping:
  - `user-interaction` -> `gpt-5-mini`
  - `helper` -> `gpt-5-nano`
- Continued use of LangChain as the model abstraction layer

## Out of Scope

- Embedding model migration or embedding factory design
- Vector store changes
- Audio transcription provider migration
- Multi-provider orchestration or advanced provider fallback strategies
- Tool redesign or prompt redesign unrelated to model selection
- Runtime model selection based on business context beyond the two approved categories

## Developer Outcomes

- Developers no longer instantiate provider-specific chat models in feature code
- A model swap is performed by changing one centralized file instead of editing many call sites
- The purpose of a model call is explicit at the call site through `helper` or `user-interaction`
- The codebase becomes easier to audit for model usage and easier to evolve safely

## Business and Engineering Rules

1. All chat-model creation must go through `getLlmModel(type: 'helper' | 'user-interaction')`.
2. Feature code must not construct provider-specific chat models directly once this feature is adopted.
3. LangChain remains the abstraction layer used by the application for chat models.
4. `user-interaction` is for user-facing assistant behavior and other conversational flows where response quality is primary.
5. `helper` is for narrower internal tasks where lower cost and speed are preferred over richer conversational ability.
6. Chat-model swaps must become a one-file change for model selection.
7. Embeddings remain a separate concern and must not be coupled to this feature by default.
8. The feature should reduce configuration sprawl, not add a large abstraction hierarchy.

## Edge Cases

### Mixed responsibilities in one module

- if a module performs both user-facing and helper-style LLM work, each call site should request the appropriate type explicitly

### Future provider or model changes

- if the team later changes provider or model names, feature call sites should remain unchanged as long as the factory contract stays the same

### Unsupported use case

- if a new LLM use case does not fit `helper` or `user-interaction`, the team should evaluate whether to extend the factory contract deliberately rather than bypassing it

## Acceptance Criteria

1. The repository defines a centralized factory function with the contract `getLlmModel(type: 'helper' | 'user-interaction')`.
2. Chat-model call sites use the factory instead of constructing provider-specific models directly.
3. The factory is the single place where chat-model assignment is defined.
4. The model used for `user-interaction` can be changed by editing one file.
5. The model used for `helper` can be changed by editing one file.
6. The feature keeps LangChain as the application’s chat-model abstraction layer.
7. Embedding model configuration remains outside the scope of this feature.
8. The repository can support the planned mapping of `gpt-5-mini` for `user-interaction` and `gpt-5-nano` for `helper` without requiring model-specific call-site changes.

## Assumptions

1. The current LLM usages in this codebase can be grouped cleanly into `helper` and `user-interaction`.
2. LangChain can continue to provide the abstraction needed for these chat-model call sites.
3. Model-specific behavior differences will be handled within the centralized model-selection layer or downstream testing, not by scattering provider logic through feature code.
4. Embeddings do not need to move as part of this feature’s first delivery slice.

## Risks

- Some current LLM usages may not fit neatly into the two-category model and may reveal ambiguity during implementation.
- Provider differences in tool calling, streaming, or output shape may still require careful validation even with a shared factory.
- If any call sites bypass the factory, the main value of one-file model switching will be undermined.
- If the factory grows beyond simple model selection, it may become the heavy abstraction layer the team wants to avoid.
