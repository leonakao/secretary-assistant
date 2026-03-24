import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Confirmation,
  ConfirmationInteractionPending,
  ConfirmationStatus,
} from '../entities/confirmation.entity';

export class PendingConfirmation {
  id: string;
  contactId: string;
  userId: string;
  description: string;
  expectedResult: string;
}

@Injectable()
export class FindPendingConfirmationsService {
  constructor(
    @InjectRepository(Confirmation)
    private readonly confirmationRepository: Repository<Confirmation>,
  ) {}

  async execute(params: {
    companyId: string;
    userId?: string;
    contactId?: string;
  }): Promise<PendingConfirmation[]> {
    return await this.confirmationRepository.find({
      select: ['id', 'contactId', 'userId', 'description', 'expectedResult'],
      where: {
        status: ConfirmationStatus.ACTIVE,
        companyId: params.companyId,
        userId: params.userId,
        contactId: params.contactId,
        interactionPending: params.userId
          ? ConfirmationInteractionPending.USER
          : ConfirmationInteractionPending.CONTACT,
      },
    });
  }
}
