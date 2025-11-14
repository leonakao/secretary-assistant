import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceRequest } from './entities/service-request.entity';
import { FindPendingConfirmationsService } from './services/find-pending-confirmations.service';
import { Confirmation } from './entities/confirmation.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { User } from '../users/entities/user.entity';
import { FindResponsibleUserService } from './services/find-responsible-user.service';
import { CreateConfirmationService } from './services/create-confirmation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceRequest, Confirmation, Contact, User]),
  ],
  providers: [
    FindPendingConfirmationsService,
    FindResponsibleUserService,
    CreateConfirmationService,
  ],
  exports: [
    FindPendingConfirmationsService,
    FindResponsibleUserService,
    CreateConfirmationService,
  ],
})
export class ServiceRequestsModule {}
