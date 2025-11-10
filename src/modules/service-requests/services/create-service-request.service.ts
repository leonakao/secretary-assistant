import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ServiceRequest,
  ServiceRequestStatus,
} from '../entities/service-request.entity';
import { CreateServiceRequestDto } from '../types/service-request.types';

@Injectable()
export class CreateServiceRequestService {
  private readonly logger = new Logger(CreateServiceRequestService.name);

  constructor(
    @InjectRepository(ServiceRequest)
    private serviceRequestRepository: Repository<ServiceRequest>,
  ) {}

  async execute(dto: CreateServiceRequestDto): Promise<ServiceRequest> {
    this.logger.log(
      `Creating service request of type ${dto.requestType} for contact ${dto.contactId}`,
    );

    const serviceRequest = this.serviceRequestRepository.create({
      companyId: dto.companyId,
      contactId: dto.contactId,
      requestType: dto.requestType,
      title: dto.title,
      description: dto.description,
      metadata: dto.metadata || {},
      scheduledFor: dto.scheduledFor,
      status: ServiceRequestStatus.PENDING,
    });

    return this.serviceRequestRepository.save(serviceRequest);
  }
}
