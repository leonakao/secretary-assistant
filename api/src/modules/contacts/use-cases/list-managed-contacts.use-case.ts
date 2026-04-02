import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { User } from 'src/modules/users/entities/user.entity';
import { UserCompany } from 'src/modules/companies/entities/user-company.entity';
import { findManagedUserCompany } from 'src/modules/companies/utils/find-managed-user-company';
import { ContactSessionService } from 'src/modules/chat/services/contact-session.service';
import { Memory } from 'src/modules/chat/entities/memory.entity';
import { Contact } from '../entities/contact.entity';
import type {
  ManagedContactListItem,
  ManagedContactsListResponse,
} from './contacts-management.types';

interface ExecuteInput {
  page: number;
  pageSize: number;
}

@Injectable()
export class ListManagedContactsUseCase {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
    private readonly contactSessionService: ContactSessionService,
  ) {}

  async execute(
    user: User,
    input: ExecuteInput,
  ): Promise<ManagedContactsListResponse> {
    const userCompany = await findManagedUserCompany(
      this.userCompanyRepository,
      user.id,
    );

    if (!userCompany) {
      throw new NotFoundException('No managed company found for this user');
    }

    const contacts = await this.contactRepository.find({
      where: { companyId: userCompany.companyId },
      order: { createdAt: 'DESC' },
    });

    const latestMemoryBySessionId = await this.findLatestMemories(
      userCompany.companyId,
      contacts,
    );

    const totalItems = contacts.length;
    const sortedContacts = contacts
      .map((contact) =>
        this.toSortableListItem(
          contact,
          latestMemoryBySessionId.get(contact.id) ?? null,
        ),
      )
      .sort((left, right) => {
        const leftTime = left.lastInteractionAt?.getTime() ?? null;
        const rightTime = right.lastInteractionAt?.getTime() ?? null;

        if (leftTime !== rightTime) {
          if (leftTime === null) {
            return 1;
          }

          if (rightTime === null) {
            return -1;
          }

          return rightTime - leftTime;
        }

        const createdAtComparison =
          right.createdAt.getTime() - left.createdAt.getTime();

        if (createdAtComparison !== 0) {
          return createdAtComparison;
        }

        return left.id.localeCompare(right.id);
      });

    const contactItems = sortedContacts
      .slice((input.page - 1) * input.pageSize, input.page * input.pageSize)
      .map(({ createdAt, ...contact }) => {
        void createdAt;
        return contact;
      });

    return {
      contacts: contactItems,
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / input.pageSize)),
      },
    };
  }

  private async findLatestMemories(
    companyId: string,
    contacts: Contact[],
  ): Promise<Map<string, Memory>> {
    const latestMemoryByContactId = new Map<string, Memory>();
    const latestMemories = await Promise.all(
      contacts.map(async (contact) => {
        const latestMemory =
          await this.contactSessionService.findLatestMemoryForContact({
            companyId,
            contactId: contact.id,
          });

        return [contact.id, latestMemory] as const;
      }),
    );

    for (const [contactId, memory] of latestMemories) {
      if (memory) {
        latestMemoryByContactId.set(contactId, memory);
      }
    }

    return latestMemoryByContactId;
  }

  private toSortableListItem(
    contact: Contact,
    memory: Memory | null,
  ): ManagedContactListItem & { createdAt: Date } {
    return {
      id: contact.id,
      name: contact.name ?? null,
      phone: contact.phone ?? null,
      email: contact.email ?? null,
      instagram: contact.instagram ?? null,
      ignoreUntil: contact.ignoreUntil ?? null,
      isIgnored: Boolean(
        contact.ignoreUntil && contact.ignoreUntil > new Date(),
      ),
      lastInteractionAt: memory?.createdAt ?? null,
      lastInteractionPreview: memory ? this.toPreview(memory.content) : null,
      createdAt: contact.createdAt,
    };
  }

  private toPreview(content: string): string {
    const normalized = content.trim().replace(/\s+/g, ' ');
    return normalized.slice(0, 120);
  }
}
