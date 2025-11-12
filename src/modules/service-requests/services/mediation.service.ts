import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Mediation,
  MediationInteractionPending,
  MediationStatus,
} from '../entities/mediation.entity';

export class PendingMediation {
  id: string;
  contactId: string;
  userId: string;
  description: string;
  expectedResult: string;
}

@Injectable()
export class MediationService {
  constructor(
    @InjectRepository(Mediation)
    private readonly mediationRepository: Repository<Mediation>,
  ) {}

  async findPendingMediations(params: {
    companyId: string;
    userId?: string;
    contactId?: string;
  }): Promise<PendingMediation[]> {
    return await this.mediationRepository.find({
      select: ['id', 'contactId', 'userId', 'description', 'expectedResult'],
      where: {
        status: MediationStatus.ACTIVE,
        companyId: params.companyId,
        userId: params.userId,
        contactId: params.contactId,
        interactionPending: params.userId
          ? MediationInteractionPending.USER
          : MediationInteractionPending.CONTACT,
      },
    });
  }
}
