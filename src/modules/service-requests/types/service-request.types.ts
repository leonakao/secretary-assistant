import { ServiceRequestStatus } from '../entities/service-request.entity';

export interface CreateServiceRequestDto {
  companyId: string;
  contactId: string;
  requestType: string;
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
  scheduledFor?: Date;
}

export interface UpdateServiceRequestDto {
  status?: ServiceRequestStatus;
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
  scheduledFor?: Date;
  internalNotes?: string;
  clientNotes?: string;
  assignedToUserId?: string;
}

export interface ServiceRequestQueryDto {
  companyId: string;
  contactId?: string;
  requestType?: string;
  status?: ServiceRequestStatus;
  assignedToUserId?: string;
  fromDate?: Date;
  toDate?: Date;
}
