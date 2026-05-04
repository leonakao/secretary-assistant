import type { RunnableConfig } from '@langchain/core/runnables';
import { getLangWatchTracer } from 'langwatch';
import { LangWatchCallbackHandler } from 'langwatch/observability/instrumentation/langchain';
import {
  setupObservability,
  type ObservabilityHandle,
} from 'langwatch/observability/node';

const SERVICE_NAME = 'secretary-assistant-api';

export type LangWatchMetadata = {
  companyId?: string;
  contactId?: string;
  context_window_tokens?: number;
  instanceName?: string;
  ls_model_name?: string;
  ls_provider?: string;
  ls_temperature?: number;
  max_output_tokens?: number;
  messageQueueItemId?: string;
  operation?: string;
  routeKind?: string;
  thread_id?: string;
  threadId?: string;
  userId?: string;
};

let setupHandle: ObservabilityHandle | null = null;
let isSetupAttempted = false;

export const langWatchTracer = getLangWatchTracer(SERVICE_NAME);

export function initializeLangWatchObservability(): ObservabilityHandle | null {
  if (isSetupAttempted) {
    return setupHandle;
  }

  isSetupAttempted = true;

  const apiKey = process.env.LANGWATCH_API_KEY?.trim();
  const endpoint = process.env.LANGWATCH_ENDPOINT?.trim();

  setupHandle = setupObservability({
    serviceName: SERVICE_NAME,
    langwatch: apiKey
      ? {
          apiKey,
          endpoint: endpoint || undefined,
          processorType: 'batch',
        }
      : undefined,
    attributes: {
      'deployment.environment.name': process.env.NODE_ENV ?? 'development',
      'service.name': SERVICE_NAME,
    },
  });

  return setupHandle;
}

export function buildLangWatchAttributes(
  metadata: LangWatchMetadata,
): Record<string, string> {
  const attributes: Record<string, string> = {};

  if (metadata.companyId) {
    attributes['secretary.company.id'] = metadata.companyId;
  }

  if (metadata.contactId) {
    attributes['secretary.contact.id'] = metadata.contactId;
  }

  if (metadata.instanceName) {
    attributes['secretary.instance.name'] = metadata.instanceName;
  }

  if (typeof metadata.context_window_tokens === 'number') {
    attributes['secretary.context.window_tokens'] =
      metadata.context_window_tokens.toString();
  }

  if (typeof metadata.max_output_tokens === 'number') {
    attributes['secretary.context.max_output_tokens'] =
      metadata.max_output_tokens.toString();
  }

  if (metadata.messageQueueItemId) {
    attributes['secretary.message_queue.item_id'] = metadata.messageQueueItemId;
  }

  if (metadata.operation) {
    attributes['secretary.operation'] = metadata.operation;
  }

  if (metadata.routeKind) {
    attributes['secretary.route.kind'] = metadata.routeKind;
  }

  const threadId = metadata.thread_id ?? metadata.threadId;

  if (threadId) {
    attributes['langwatch.thread.id'] = threadId;
  }

  if (metadata.userId) {
    attributes['langwatch.user.id'] = metadata.userId;
  }

  return attributes;
}

export function createLangWatchRunnableConfig(
  config: RunnableConfig | undefined,
  metadata: LangWatchMetadata,
): RunnableConfig {
  const callbacks = config?.callbacks;
  const threadId = resolveStringMetadataValue(
    metadata.thread_id ?? metadata.threadId ?? config?.configurable?.thread_id,
  );
  const normalizedMetadata = {
    ...(config?.metadata ?? {}),
    ...metadata,
    ...(threadId ? { thread_id: threadId } : {}),
  };

  return {
    ...config,
    configurable: {
      ...(config?.configurable ?? {}),
      ...(threadId ? { thread_id: threadId } : {}),
    },
    callbacks: Array.isArray(callbacks)
      ? [...callbacks, new LangWatchCallbackHandler()]
      : callbacks || [new LangWatchCallbackHandler()],
    metadata: normalizedMetadata,
  };
}

type TokenUsage = {
  completionTokens?: number;
  promptTokens?: number;
  totalTokens?: number;
};

type LangWatchSpanLike = {
  setAttributes(attributes: Record<string, string>): unknown;
};

export function extractTokenUsage(response: unknown): TokenUsage {
  if (!response || typeof response !== 'object') {
    return {};
  }

  const candidate = response as {
    response_metadata?: Record<string, unknown>;
    usage_metadata?: Record<string, unknown>;
  };

  const usageMetadata = candidate.usage_metadata ?? {};
  const responseMetadata = candidate.response_metadata ?? {};
  const responseTokenUsage =
    responseMetadata.tokenUsage &&
    typeof responseMetadata.tokenUsage === 'object'
      ? (responseMetadata.tokenUsage as Record<string, unknown>)
      : {};

  const promptTokens = pickFirstNumber([
    usageMetadata.input_tokens,
    usageMetadata.prompt_tokens,
    responseTokenUsage.promptTokens,
    responseTokenUsage.inputTokens,
  ]);

  const completionTokens = pickFirstNumber([
    usageMetadata.output_tokens,
    usageMetadata.completion_tokens,
    responseTokenUsage.completionTokens,
    responseTokenUsage.outputTokens,
  ]);

  const totalTokens = pickFirstNumber([
    usageMetadata.total_tokens,
    responseTokenUsage.totalTokens,
    typeof promptTokens === 'number' && typeof completionTokens === 'number'
      ? promptTokens + completionTokens
      : undefined,
  ]);

  return {
    completionTokens,
    promptTokens,
    totalTokens,
  };
}

export function setLangWatchContextUtilization(
  span: LangWatchSpanLike,
  metadata: Pick<
    LangWatchMetadata,
    'context_window_tokens' | 'max_output_tokens'
  >,
  usage: TokenUsage,
): void {
  const attributes: Record<string, string> = {};

  if (typeof metadata.context_window_tokens === 'number') {
    attributes['secretary.context.window_tokens'] =
      metadata.context_window_tokens.toString();

    if (typeof usage.promptTokens === 'number') {
      attributes['secretary.context.prompt_tokens'] =
        usage.promptTokens.toString();
      attributes['secretary.context.utilization_pct'] = (
        (usage.promptTokens / metadata.context_window_tokens) *
        100
      ).toFixed(4);
    }
  }

  if (typeof metadata.max_output_tokens === 'number') {
    attributes['secretary.context.max_output_tokens'] =
      metadata.max_output_tokens.toString();
  }

  if (typeof usage.completionTokens === 'number') {
    attributes['secretary.context.completion_tokens'] =
      usage.completionTokens.toString();
  }

  if (typeof usage.totalTokens === 'number') {
    attributes['secretary.context.total_tokens'] = usage.totalTokens.toString();
  }

  if (Object.keys(attributes).length > 0) {
    span.setAttributes(attributes);
  }
}

function pickFirstNumber(values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function resolveStringMetadataValue(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}
