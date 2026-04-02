import { describe, expect, it, vi } from 'vitest';
import {
  buildContactSessionId,
  ContactSessionService,
} from './contact-session.service';

describe('ContactSessionService', () => {
  it('creates a new session when the contact has no prior memory', async () => {
    const service = new ContactSessionService({
      findOne: vi.fn().mockResolvedValue(null),
    } as any);

    const sessionId = await service.resolveActiveSessionId({
      companyId: 'company-1',
      contactId: 'contact-1',
      now: new Date('2026-04-02T12:00:00.000Z'),
    });

    expect(sessionId).toBe(
      'contact:contact-1:session:2026-04-02T12:00:00.000Z',
    );
  });

  it('reuses the current session while it is younger than 24 hours', async () => {
    const service = new ContactSessionService({
      findOne: vi.fn().mockResolvedValue({
        sessionId: buildContactSessionId(
          'contact-1',
          new Date('2026-04-02T00:00:00.000Z'),
        ),
        createdAt: new Date('2026-04-02T10:00:00.000Z'),
      }),
    } as any);

    const sessionId = await service.resolveActiveSessionId({
      companyId: 'company-1',
      contactId: 'contact-1',
      now: new Date('2026-04-02T12:00:00.000Z'),
    });

    expect(sessionId).toBe(
      'contact:contact-1:session:2026-04-02T00:00:00.000Z',
    );
  });

  it('rotates to a new session after 24 hours from the session start', async () => {
    const service = new ContactSessionService({
      findOne: vi.fn().mockResolvedValue({
        sessionId: buildContactSessionId(
          'contact-1',
          new Date('2026-04-01T00:00:00.000Z'),
        ),
        createdAt: new Date('2026-04-01T23:59:00.000Z'),
      }),
    } as any);

    const sessionId = await service.resolveActiveSessionId({
      companyId: 'company-1',
      contactId: 'contact-1',
      now: new Date('2026-04-02T12:00:00.000Z'),
    });

    expect(sessionId).toBe(
      'contact:contact-1:session:2026-04-02T12:00:00.000Z',
    );
  });
});
