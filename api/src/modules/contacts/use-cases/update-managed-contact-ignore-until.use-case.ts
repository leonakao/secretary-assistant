import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Memory } from 'src/modules/chat/entities/memory.entity';
import { UserCompany } from 'src/modules/companies/entities/user-company.entity';
import { findManagedUserCompany } from 'src/modules/companies/utils/find-managed-user-company';
import type { User } from 'src/modules/users/entities/user.entity';
import type { UpdateManagedContactIgnoreUntilDto } from '../dto/update-managed-contact-ignore-until.dto';
import { Contact } from '../entities/contact.entity';
import type { UpdateManagedContactIgnoreUntilResponse } from './contacts-management.types';

@Injectable()
export class UpdateManagedContactIgnoreUntilUseCase {
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
    dto: UpdateManagedContactIgnoreUntilDto,
  ): Promise<UpdateManagedContactIgnoreUntilResponse> {
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

    const ignoreUntil = this.normalizeIgnoreUntil(dto.ignoreUntil);

    contact.ignoreUntil = ignoreUntil as Contact['ignoreUntil'];

    const updatedContact = await this.contactRepository.save(contact);

    return {
      contact: {
        id: updatedContact.id,
        name: updatedContact.name ?? null,
        phone: updatedContact.phone ?? null,
        email: updatedContact.email ?? null,
        instagram: updatedContact.instagram ?? null,
        ignoreUntil: updatedContact.ignoreUntil ?? null,
        isIgnored: Boolean(
          updatedContact.ignoreUntil && updatedContact.ignoreUntil > new Date(),
        ),
        lastInteractionAt: await this.findLastInteractionAt(
          userCompany.companyId,
          updatedContact.phone,
        ),
        preferredUserId: updatedContact.preferredUserId ?? null,
      },
    };
  }

  private normalizeIgnoreUntil(value: string | null): Date | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('ignoreUntil must be a valid ISO date');
    }

    if (parsed <= new Date()) {
      throw new BadRequestException('ignoreUntil must be a future date');
    }

    return parsed;
  }

  private async findLastInteractionAt(
    companyId: string,
    phone: string | null,
  ): Promise<Date | null> {
    if (!phone) {
      return null;
    }

    const latestMemory = await this.memoryRepository.findOne({
      where: {
        companyId,
        sessionId: `whatsapp:${companyId}:${phone}`,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return latestMemory?.createdAt ?? null;
  }
}
