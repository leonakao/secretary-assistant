# Centralized LLM Model Factory Design

## Scope

This feature affects `api/` only.

The current direct chat-model constructions all live in the AI module:

- `src/modules/ai/agents/client-assistant.agent.ts`
- `src/modules/ai/agents/owner-assistant.agent.ts`
- `src/modules/ai/agents/onboarding-assistant.agent.ts`
- `src/modules/ai/services/langchain.service.ts`

This feature also includes:

- `src/modules/ai/services/audio-transcription.service.ts`

One related AI integration stays out of scope for this slice:

- `src/modules/ai/stores/postgres.store.ts`

Embeddings remain intentionally excluded because the approved feature is about chat-model centralization plus OpenAI transcription migration, not vector infrastructure changes.

## Current Problem

The AI module currently instantiates `ChatGoogleGenerativeAI` inline at each call site with repeated provider-specific configuration:

- provider class is imported into feature code
- API key lookup is duplicated
- model name and token settings are repeated
- changing chat models requires touching multiple files

This directly violates the approved requirement that model changes become a one-file change.

## Decision

Introduce a single AI factory function:

`getLlmModel(type: 'helper' | 'user-interaction')`

The function will live in the AI module and will be the only place that chooses:

- provider wrapper
- API key source
- model name
- base generation settings

Every chat-model call site in scope must request a model through this function.

Audio transcription is intentionally a separate integration path and must not use `getLlmModel(...)`.

## Proposed Implementation

### 1. Add an AI model factory service

Create a small injectable service or provider in `src/modules/ai/` whose public API is:

`getLlmModel(type: 'helper' | 'user-interaction')`

The implementation should stay deliberately simple:

- no adapter hierarchy
- no runtime fallback orchestration
- no feature-specific branching
- no embeddings logic

The service is responsible for:

- reading OpenAI configuration from env
- mapping `user-interaction` to `gpt-5-mini`
- mapping `helper` to `gpt-5-nano`
- returning the corresponding LangChain chat model instance

### 2. Use LangChain OpenAI chat models behind the factory

The current API package only depends on Google chat models. This feature adds the LangChain OpenAI package and config needed to construct GPT-based chat models while keeping LangChain as the application abstraction layer.

The model selection is centralized in one file so a future change like:

- `gpt-5-mini` -> `gpt-5.4-mini`
- `gpt-5-nano` -> another helper model

requires editing only the factory implementation.

### 3. Migrate in-scope chat-model call sites

The following modules will stop importing provider-specific chat classes and instead depend on the factory:

- `ClientAssistantAgent` -> `user-interaction`
- `OwnerAssistantAgent` -> `user-interaction`
- `OnboardingAssistantAgent` -> `user-interaction`
- `LangchainService`

`LangchainService` is the only ambiguous case because it exposes generic chat helpers. For this feature it should default to `helper`, since it is shared utility logic rather than a first-class user-facing assistant agent. If a future call path requires user-facing behavior from this service, the call should request that explicitly rather than bypassing the factory.

### 4. Migrate audio transcription separately from the chat factory

`AudioTranscriptionService` currently uses Gemini through a multimodal chat prompt. That should be replaced with OpenAI's dedicated speech-to-text API.

This lane should remain separate from the chat-model factory because:

- transcription is not a chat-model responsibility
- the OpenAI audio API has a different request shape from chat models
- forcing transcription through `getLlmModel(...)` would blur the abstraction boundary the feature is trying to clean up

The transcription service should:

- read `OPENAI_API_KEY`
- use an explicit OpenAI transcription model in one service file
- preserve the existing service contract of returning plain transcript text
- keep MIME validation in place

### 5. Keep embeddings isolated

The design explicitly does not migrate:

- vector embedding model selection

This keeps the new factory focused and avoids collapsing unrelated model responsibilities into one abstraction.

## Configuration

Add OpenAI configuration for the API:

- `OPENAI_API_KEY`

Chat model names should be defined in the factory file, not spread through env vars, because the approved business rule is that chat-model assignment is controlled in one code file.

The transcription model should be defined in `AudioTranscriptionService`, because it is intentionally not part of the chat-model factory.

If environment-specific model overrides become necessary later, that should be a deliberate follow-up feature rather than part of this initial centralization slice.

## Dependency and Module Changes

### Dependencies

Add the LangChain OpenAI package to `api/package.json`.

Add the official OpenAI SDK if needed for the transcription API integration.

### Nest wiring

Register the model factory provider in `AiModule` so all in-scope agents and services can inject it.

## Testing Strategy

Add focused unit tests around the factory and its configuration rules.

Minimum coverage for this feature:

- returns a `user-interaction` model using the configured OpenAI key
- returns a `helper` model using the configured OpenAI key
- throws a clear error when `OPENAI_API_KEY` is missing
- verifies the category-to-model mapping in one place
- transcribes supported audio through the OpenAI transcription client path
- fails clearly when transcription is attempted without `OPENAI_API_KEY`
- preserves unsupported MIME type rejection in `AudioTranscriptionService`

Also add or update tests for any refactored service whose constructor behavior changes because it now depends on the factory.

## Risks and Validation Points

### Tool calling compatibility

The assistant agents use LangGraph tool calling. The main migration risk is behavioral compatibility between the current Gemini wrapper and the OpenAI wrapper when:

- binding tools
- streaming
- handling turns that contain tool calls only

This feature does not redesign tools, but implementation must validate that existing LangGraph flows still work with the factory-provided model.

### Audio API compatibility

The transcription lane must validate:

- correct conversion of input audio payloads to the OpenAI transcription request format
- response parsing into plain transcript text
- preservation of current service-level error behavior for unsupported MIME types

### Generic type compatibility

Some utility nodes currently type models as `ChatGoogleGenerativeAI`. Those signatures may need to widen to a LangChain base chat model or runnable-compatible type so provider-specific types are removed from shared AI graph code.

### Hidden bypasses

Feature value is lost if any in-scope chat call site continues to instantiate a provider model directly. The implementation must remove those imports from the migrated modules.

## Acceptance Mapping

- AC1, AC3, AC4, AC5: satisfied by the centralized factory implementation
- AC2: satisfied by migrating all in-scope chat-model call sites
- AC6: satisfied by using LangChain OpenAI wrappers behind the factory
- AC7: satisfied by a dedicated OpenAI transcription integration outside the chat factory
- AC8: satisfied by leaving embeddings untouched
- AC9: satisfied by hiding chat provider/model choice behind the factory contract
