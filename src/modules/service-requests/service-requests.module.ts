import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceRequest } from './entities/service-request.entity';
import { MediationService } from './services/mediation.service';
import { Mediation } from './entities/mediation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceRequest, Mediation])],
  providers: [MediationService],
  exports: [MediationService],
})
export class ServiceRequestsModule {}
