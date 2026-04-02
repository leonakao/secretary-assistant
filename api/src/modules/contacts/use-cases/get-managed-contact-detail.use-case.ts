import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { User } from 'src/modules/users/entities/user.entity';
import { UserCompany } from 'src/modules/companies/entities/user-company.entity';
import { findManagedUserCompany } from 'src/modules/companies/utils/find-managed-user-company';
import { Memory } from 'src/modules/chat/entities/memory.entity';
import { Contact } from '../entities/contact.entity';
import type { ManagedContactDetailResponse } from './contacts-management.types';

const DETAIL_MESSAGE_LIMIT = 30;

@Injectable()
export class GetManagedContactDetailUseCase {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
    @InjectRepository(Memory)
    private readonly memoryRepository: Repository<Memory>,
  ) {}

  async execute(
    user: User,
    contactId: string,
  ): Promise<ManagedContactDetailResponse> {
    const userCompany = await findManagedUserCompany(
      this.userCompanyRepository,
      user.id,
    );

    if (!userCompany) {
      throw new NotFoundException('No managed company found for this user');
    }

    const contact = await this.contactRepository.findOne({
      where: {
        id: contactId,
        companyId: userCompany.companyId,
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const { memories, hasMore } = await this.findConversationMemories(
      userCompany.companyId,
      contact.phone,
    );

    const lastInteractionAt =
      memories.length > 0 ? memories[memories.length - 1].createdAt : null;

    return {
      contact: {
        id: contact.id,
        name: contact.name ?? null,
        phone: contact.phone ?? null,
        email: contact.email ?? null,
        instagram: contact.instagram ?? null,
        ignoreUntil: contact.ignoreUntil ?? null,
        isIgnored: Boolean(
          contact.ignoreUntil && contact.ignoreUntil > new Date(),
        ),
        lastInteractionAt,
        preferredUserId: contact.preferredUserId ?? null,
      },
      conversation: {
        messages: memories.map((memory) => ({
          id: memory.id,
          role: memory.role,
          content: memory.content,
          createdAt: memory.createdAt,
        })),
        hasMore,
      },
    };
  }

  private async findConversationMemories(
    companyId: string,
    phone: string | null,
  ): Promise<{ memories: Memory[]; hasMore: boolean }> {
    if (!phone) {
      return { memories: [], hasMore: false };
    }

    const memories = await this.memoryRepository.find({
      where: {
        companyId,
        sessionId: `whatsapp:${companyId}:${phone}`,
      },
      order: { createdAt: 'DESC' },
      take: DETAIL_MESSAGE_LIMIT + 1,
    });

    const hasMore = memories.length > DETAIL_MESSAGE_LIMIT;
    const boundedMemories = hasMore
      ? memories.slice(0, DETAIL_MESSAGE_LIMIT)
      : memories;

    return {
      memories: boundedMemories.reverse(),
      hasMore,
    };
  }
}
