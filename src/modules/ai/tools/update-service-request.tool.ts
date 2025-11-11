import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { ServiceRequest } from 'src/modules/service-requests';
import { ToolConfig } from '../types';

const updateServiceRequestSchema = z.object({
  requestId: z.string().describe('O ID da requisição a ser atualizada'),
  status: z
    .string()
    .optional()
    .describe('Novo status (pending, in_progress, completed, cancelled)'),
  title: z.string().optional().describe('Novo título'),
  description: z.string().optional().describe('Nova descrição'),
  scheduledFor: z
    .string()
    .optional()
    .describe(
      'Nova data e hora agendada (formato ISO 8601, ex: 2024-11-10T15:30:00)',
    ),
  internalNotes: z.string().optional().describe('Notas internas adicionais'),
  assignedToUserId: z.string().optional().describe('ID do usuário responsável'),
});

@Injectable()
export class UpdateServiceRequestTool extends StructuredTool {
  private readonly logger = new Logger(UpdateServiceRequestTool.name);

  name = 'updateServiceRequest';
  description =
    'Atualiza uma requisição de serviço existente. Use para modificar status, reagendar ou adicionar informações. Caso você não tenha o ID da requisição que precisa atualizar, você pode utilizar alguma referência do contato para acha-la.';
  schema = updateServiceRequestSchema;

  constructor(
    @InjectRepository(ServiceRequest)
    private readonly serviceRequestRepository: Repository<ServiceRequest>,
  ) {
    super();
  }

  protected async _call(
    args: z.infer<typeof updateServiceRequestSchema>,
    _,
    config: ToolConfig,
  ): Promise<string> {
    const {
      requestId,
      status,
      title,
      description,
      scheduledFor,
      internalNotes,
      assignedToUserId,
    } = args;

    const { companyId } = config.configurable.context;

    if (!companyId) {
      throw new Error('Company ID missing in the context');
    }

    const serviceRequest = await this.serviceRequestRepository.findOne({
      where: {
        id: requestId,
        companyId,
      },
    });

    if (!serviceRequest) {
      const result = {
        success: false,
        error: 'Service request not found',
        message: `Requisição com ID ${requestId} não encontrada`,
      };
      return JSON.stringify(result, null, 2);
    }

    const updates: Partial<ServiceRequest> = {};

    if (status) updates.status = status as any;
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (scheduledFor) updates.scheduledFor = new Date(scheduledFor);
    if (assignedToUserId) updates.assignedToUserId = assignedToUserId;

    if (internalNotes) {
      updates.internalNotes = serviceRequest.internalNotes
        ? `${serviceRequest.internalNotes}\n\n${internalNotes}`
        : internalNotes;
    }

    await this.serviceRequestRepository.save(serviceRequest);

    const result = {
      success: true,
      message: 'Requisição atualizada com sucesso',
      serviceRequest: {
        id: serviceRequest.id,
        contactId: serviceRequest.contactId,
        requestType: serviceRequest.requestType,
        title: serviceRequest.title,
        description: serviceRequest.description,
        status: serviceRequest.status,
        scheduledFor: serviceRequest.scheduledFor,
        clientNotes: serviceRequest.clientNotes,
        internalNotes: serviceRequest.internalNotes,
        assignedToUserId: serviceRequest.assignedToUserId,
        companyId: serviceRequest.companyId,
        updatedAt: serviceRequest.updatedAt,
      },
    };

    return JSON.stringify(result, null, 2);
  }
}
