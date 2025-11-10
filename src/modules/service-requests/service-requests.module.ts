import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceRequest } from './entities/service-request.entity';
import { CreateServiceRequestService } from './services/create-service-request.service';
import { UpdateServiceRequestService } from './services/update-service-request.service';
import { FindServiceRequestService } from './services/find-service-request.service';
import { QueryServiceRequestService } from './services/query-service-request.service';
import { CancelServiceRequestService } from './services/cancel-service-request.service';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceRequest])],
  providers: [
    CreateServiceRequestService,
    UpdateServiceRequestService,
    FindServiceRequestService,
    QueryServiceRequestService,
    CancelServiceRequestService,
  ],
  exports: [
    CreateServiceRequestService,
    UpdateServiceRequestService,
    FindServiceRequestService,
    QueryServiceRequestService,
    CancelServiceRequestService,
  ],
})
export class ServiceRequestsModule {}
