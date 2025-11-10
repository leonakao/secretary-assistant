import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ServiceRequest,
  ServiceRequestStatus,
} from '../entities/service-request.entity';
import { UpdateServiceRequestDto } from '../types/service-request.types';

@Injectable()
export class UpdateServiceRequestService {
  private readonly logger = new Logger(UpdateServiceRequestService.name);

  constructor(
    @InjectRepository(ServiceRequest)
    private serviceRequestRepository: Repository<ServiceRequest>,
  ) {}

  async execute(
    id: string,
    dto: UpdateServiceRequestDto,
  ): Promise<ServiceRequest> {
    const serviceRequest = await this.serviceRequestRepository.findOne({
      where: { id },
    });

    if (!serviceRequest) {
      throw new NotFoundException(`Service request ${id} not found`);
    }

    Object.assign(serviceRequest, dto);

    if (
      dto.status === ServiceRequestStatus.COMPLETED &&
      !serviceRequest.completedAt
    ) {
      serviceRequest.completedAt = new Date();
    }

    this.logger.log(`Updating service request ${id}`);
    return this.serviceRequestRepository.save(serviceRequest);
  }
}
