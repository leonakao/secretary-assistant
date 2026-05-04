import {
  buildLangWatchAttributes,
  createLangWatchRunnableConfig,
} from './langwatch';

describe('LangWatch observability helpers', () => {
  it('normalizes threadId into LangWatch attributes', () => {
    expect(
      buildLangWatchAttributes({
        operation: 'test_operation',
        threadId: 'thread-1',
      }),
    ).toMatchObject({
      'langwatch.thread.id': 'thread-1',
      'secretary.operation': 'test_operation',
    });
  });

  it('preserves thread_id in RunnableConfig metadata for LangWatch callbacks', () => {
    const config = createLangWatchRunnableConfig(
      {
        configurable: {
          context: { companyId: 'company-1' },
        },
        metadata: {
          existing: 'value',
        },
      },
      {
        operation: 'test_operation',
        threadId: 'thread-1',
        userId: 'user-1',
      },
    );

    expect(config.configurable).toMatchObject({
      context: { companyId: 'company-1' },
      thread_id: 'thread-1',
    });
    expect(config.metadata).toMatchObject({
      existing: 'value',
      operation: 'test_operation',
      threadId: 'thread-1',
      thread_id: 'thread-1',
      userId: 'user-1',
    });
  });

  it('prefers explicit thread_id metadata over camelCase threadId', () => {
    const config = createLangWatchRunnableConfig(undefined, {
      operation: 'test_operation',
      thread_id: 'thread-snake',
      threadId: 'thread-camel',
    });

    expect(config.configurable).toMatchObject({
      thread_id: 'thread-snake',
    });
    expect(config.metadata).toMatchObject({
      thread_id: 'thread-snake',
      threadId: 'thread-camel',
    });
  });
});
