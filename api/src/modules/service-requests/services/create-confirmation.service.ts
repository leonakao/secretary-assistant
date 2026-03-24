import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  Confirmation,
  ConfirmationInteractionPending,
  ConfirmationStatus,
} from '../entities/confirmation.entity';
import { Contact } from 'src/modules/contacts/entities/contact.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { FindResponsibleUserService } from './find-responsible-user.service';

export interface CreateConfirmationInput {
  companyId: string;
  contactId: string;
  description: string;
  expectedResult: string;
  metadata?: Record<string, unknown> | null;
  interactionPending: ConfirmationInteractionPending;
  userId?: string;
}

@Injectable()
export class CreateConfirmationService {
  constructor(
    @InjectRepository(Confirmation)
    private readonly confirmationRepository: Repository<Confirmation>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly findResponsibleUserService: FindResponsibleUserService,
  ) {}

  async execute(input: CreateConfirmationInput): Promise<Confirmation> {
    const {
      companyId,
      contactId,
      description,
      expectedResult,
      metadata,
      interactionPending,
      userId,
    } = input;

    const contact = await this.contactRepository.findOneByOrFail({
      id: contactId,
      companyId,
    });

    const responsibleUser = await this.resolveUser({
      companyId,
      userId,
      contact,
    });

    if (!responsibleUser) {
      throw new Error(
        'Unable to find a responsible user for this confirmation',
      );
    }

    const confirmation = this.confirmationRepository.create({
      companyId,
      userId: responsibleUser.id,
      contactId,
      description,
      expectedResult,
      interactionPending,
      status: ConfirmationStatus.ACTIVE,
      metadata: metadata ?? null,
    });

    return await this.confirmationRepository.save(confirmation);
  }

  private async resolveUser(params: {
    companyId: string;
    userId?: string;
    contact: Contact;
  }): Promise<User | null> {
    const { companyId, userId, contact } = params;

    if (userId) {
      const user = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin(
          'user.userCompanies',
          'userCompany',
          'userCompany.companyId = :companyId',
          { companyId },
        )
        .where('user.id = :userId', { userId })
        .getOne();

      if (user) {
        return user;
      }
    }

    return await this.findResponsibleUserService.execute(contact);
  }
}
