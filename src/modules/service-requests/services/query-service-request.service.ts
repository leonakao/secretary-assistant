import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import {
  ServiceRequest,
  ServiceRequestStatus,
} from '../entities/service-request.entity';
import { ServiceRequestQueryDto } from '../types/service-request.types';

@Injectable()
export class QueryServiceRequestService {
  constructor(
    @InjectRepository(ServiceRequest)
    private serviceRequestRepository: Repository<ServiceRequest>,
  ) {}

  async query(dto: ServiceRequestQueryDto): Promise<ServiceRequest[]> {
    const where: any = {
      companyId: dto.companyId,
    };

    if (dto.contactId) {
      where.contactId = dto.contactId;
    }

    if (dto.requestType) {
      where.requestType = dto.requestType;
    }

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.assignedToUserId) {
      where.assignedToUserId = dto.assignedToUserId;
    }

    if (dto.fromDate && dto.toDate) {
      where.createdAt = Between(dto.fromDate, dto.toDate);
    } else if (dto.fromDate) {
      where.createdAt = Between(dto.fromDate, new Date());
    }

    return this.serviceRequestRepository.find({
      where,
      relations: ['contact', 'assignedToUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByContactAndType(
    contactId: string,
    requestType: string,
  ): Promise<ServiceRequest[]> {
    return this.serviceRequestRepository.find({
      where: {
        contactId,
        requestType,
        status: In([
          ServiceRequestStatus.PENDING,
          ServiceRequestStatus.CONFIRMED,
          ServiceRequestStatus.IN_PROGRESS,
        ]),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getActiveRequestsForContact(
    contactId: string,
  ): Promise<ServiceRequest[]> {
    return this.serviceRequestRepository.find({
      where: {
        contactId,
        status: In([
          ServiceRequestStatus.PENDING,
          ServiceRequestStatus.CONFIRMED,
          ServiceRequestStatus.IN_PROGRESS,
          ServiceRequestStatus.WAITING_PARTS,
          ServiceRequestStatus.READY,
        ]),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getRequestsByStatus(
    companyId: string,
    status: ServiceRequestStatus,
  ): Promise<ServiceRequest[]> {
    return this.serviceRequestRepository.find({
      where: { companyId, status },
      relations: ['contact'],
      order: { createdAt: 'DESC' },
    });
  }
}
