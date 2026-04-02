import { resolveThreadId } from './resolve-thread-id';

describe('resolveThreadId', () => {
  it('prefers configurable.thread_id when present', () => {
    expect(
      resolveThreadId(
        {
          configurable: {
            thread_id: 'onboarding:company-1:user-1',
          },
        },
        {
          contactId: 'contact-1',
          userId: 'user-1',
        },
      ),
    ).toBe('onboarding:company-1:user-1');
  });

  it('falls back to contactId and then userId when thread_id is absent', () => {
    expect(
      resolveThreadId(undefined, {
        contactId: 'contact-1',
        userId: 'user-1',
      }),
    ).toBe('contact-1');

    expect(
      resolveThreadId(undefined, {
        userId: 'user-1',
      }),
    ).toBe('user-1');
  });
});
