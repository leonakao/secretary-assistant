import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ServiceRequest } from '../entities/service-request.entity';
import { Repository } from 'typeorm';

@Injectable()
export class FindServiceRequestService {
  constructor(
    @InjectRepository(ServiceRequest)
    private serviceRequestRepository: Repository<ServiceRequest>,
  ) {}

  async findById(id: string): Promise<ServiceRequest | null> {
    return this.serviceRequestRepository.findOne({
      where: { id },
      relations: ['contact', 'company', 'assignedToUser'],
    });
  }
}
