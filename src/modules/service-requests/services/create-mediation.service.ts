import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  Mediation,
  MediationInteractionPending,
  MediationStatus,
} from '../entities/mediation.entity';
import { Contact } from 'src/modules/contacts/entities/contact.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { FindResponsibleUserService } from './find-responsible-user.service';

export interface CreateMediationInput {
  companyId: string;
  contactId: string;
  description: string;
  expectedResult: string;
  metadata?: Record<string, unknown> | null;
  interactionPending: MediationInteractionPending;
  userId?: string;
}

@Injectable()
export class CreateMediationService {
  constructor(
    @InjectRepository(Mediation)
    private readonly mediationRepository: Repository<Mediation>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly findResponsibleUserService: FindResponsibleUserService,
  ) {}

  async execute(input: CreateMediationInput): Promise<Mediation> {
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
      throw new Error('Unable to find a responsible user for this mediation');
    }

    const mediation = this.mediationRepository.create({
      companyId,
      userId: responsibleUser.id,
      contactId,
      description,
      expectedResult,
      interactionPending,
      status: MediationStatus.ACTIVE,
      metadata: metadata ?? null,
    });

    return await this.mediationRepository.save(mediation);
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
