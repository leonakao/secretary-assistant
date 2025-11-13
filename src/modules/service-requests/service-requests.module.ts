import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceRequest } from './entities/service-request.entity';
import { MediationService } from './services/mediation.service';
import { Mediation } from './entities/mediation.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { User } from '../users/entities/user.entity';
import { FindResponsibleUserService } from './services/find-responsible-user.service';
import { CreateMediationService } from './services/create-mediation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceRequest, Mediation, Contact, User]),
  ],
  providers: [
    MediationService,
    FindResponsibleUserService,
    CreateMediationService,
  ],
  exports: [
    MediationService,
    FindResponsibleUserService,
    CreateMediationService,
  ],
})
export class ServiceRequestsModule {}
