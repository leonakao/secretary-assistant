import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ServiceRequest,
  ServiceRequestStatus,
} from '../entities/service-request.entity';

@Injectable()
export class CancelServiceRequestService {
  private readonly logger = new Logger(CancelServiceRequestService.name);

  constructor(
    @InjectRepository(ServiceRequest)
    private serviceRequestRepository: Repository<ServiceRequest>,
  ) {}

  async execute(id: string, reason?: string): Promise<ServiceRequest> {
    const serviceRequest = await this.serviceRequestRepository.findOne({
      where: { id },
    });

    if (!serviceRequest) {
      throw new NotFoundException(`Service request ${id} not found`);
    }

    serviceRequest.status = ServiceRequestStatus.CANCELLED;
    if (reason) {
      serviceRequest.clientNotes = reason;
    }

    this.logger.log(`Cancelling service request ${id}`);
    return this.serviceRequestRepository.save(serviceRequest);
  }
}
