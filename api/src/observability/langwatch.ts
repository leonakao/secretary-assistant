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
  instanceName?: string;
  ls_model_name?: string;
  ls_provider?: string;
  ls_temperature?: number;
  messageQueueItemId?: string;
  operation?: string;
  routeKind?: string;
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

  if (metadata.messageQueueItemId) {
    attributes['secretary.message_queue.item_id'] = metadata.messageQueueItemId;
  }

  if (metadata.operation) {
    attributes['secretary.operation'] = metadata.operation;
  }

  if (metadata.routeKind) {
    attributes['secretary.route.kind'] = metadata.routeKind;
  }

  if (metadata.threadId) {
    attributes['langwatch.thread.id'] = metadata.threadId;
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

  return {
    ...config,
    callbacks: Array.isArray(callbacks)
      ? [...callbacks, new LangWatchCallbackHandler()]
      : callbacks || [new LangWatchCallbackHandler()],
    metadata: {
      ...(config?.metadata ?? {}),
      ...metadata,
    },
  };
}
