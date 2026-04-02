import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Memory } from '../entities/memory.entity';

const CONTACT_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export function buildContactSessionPrefix(contactId: string): string {
  return `contact:${contactId}:session:`;
}

export function buildContactSessionId(
  contactId: string,
  startedAt: Date = new Date(),
): string {
  return `${buildContactSessionPrefix(contactId)}${startedAt.toISOString()}`;
}

function parseContactSessionStartedAt(
  sessionId: string,
  contactId: string,
): Date | null {
  const prefix = buildContactSessionPrefix(contactId);

  if (!sessionId.startsWith(prefix)) {
    return null;
  }

  const startedAt = new Date(sessionId.slice(prefix.length));
  return Number.isNaN(startedAt.getTime()) ? null : startedAt;
}

@Injectable()
export class ContactSessionService {
  constructor(
    @InjectRepository(Memory)
    private readonly memoryRepository: Repository<Memory>,
  ) {}

  async resolveActiveSessionId(params: {
    companyId: string;
    contactId: string;
    now?: Date;
  }): Promise<string> {
    const now = params.now ?? new Date();
    const latestMemory = await this.findLatestMemoryForContact(params);

    if (!latestMemory) {
      return buildContactSessionId(params.contactId, now);
    }

    if (
      this.isSessionActive({
        contactId: params.contactId,
        latestMemory,
        now,
      })
    ) {
      return latestMemory.sessionId;
    }

    return buildContactSessionId(params.contactId, now);
  }

  async findLatestMemoryForContact(params: {
    companyId: string;
    contactId: string;
  }): Promise<Memory | null> {
    return this.memoryRepository.findOne({
      where: this.buildContactSessionWhereClauses(
        params.companyId,
        params.contactId,
      ),
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findConversationMemories(params: {
    companyId: string;
    contactId: string;
    limit: number;
  }): Promise<Memory[]> {
    return this.memoryRepository.find({
      where: this.buildContactSessionWhereClauses(
        params.companyId,
        params.contactId,
      ),
      order: {
        createdAt: 'DESC',
      },
      take: params.limit,
    });
  }

  private isSessionActive(params: {
    contactId: string;
    latestMemory: Memory;
    now: Date;
  }): boolean {
    const sessionStartedAt =
      parseContactSessionStartedAt(
        params.latestMemory.sessionId,
        params.contactId,
      ) ?? params.latestMemory.createdAt;

    return (
      sessionStartedAt.getTime() + CONTACT_SESSION_DURATION_MS >
      params.now.getTime()
    );
  }

  private buildContactSessionWhereClauses(
    companyId: string,
    contactId: string,
  ): Array<Pick<Memory, 'companyId' | 'sessionId'>> {
    return [
      {
        companyId,
        sessionId: Like(`${buildContactSessionPrefix(contactId)}%`) as never,
      },
    ];
  }
}
