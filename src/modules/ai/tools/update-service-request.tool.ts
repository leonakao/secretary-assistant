import { StructuredTool } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { ServiceRequest } from 'src/modules/service-requests';

const updateServiceRequestSchema = z.object({
  requestId: z.string().describe('O ID da requisição a ser atualizada'),
  status: z
    .string()
    .optional()
    .describe('Novo status (pending, in_progress, completed, cancelled)'),
  title: z.string().optional().describe('Novo título'),
  description: z.string().optional().describe('Nova descrição'),
  scheduledFor: z.date().optional().describe('Nova data e hora agendada'),
  internalNotes: z.string().optional().describe('Notas internas adicionais'),
  assignedToUserId: z.string().optional().describe('ID do usuário responsável'),
});

@Injectable()
export class UpdateServiceRequestTool extends StructuredTool {
  name = 'updateServiceRequest';
  description =
    'Atualiza uma requisição de serviço existente. Use para modificar status, reagendar ou adicionar informações.';
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
    config,
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

    if (!config?.context?.companyId) {
      throw new Error('Company ID missing in the context');
    }

    const serviceRequest = await this.serviceRequestRepository.findOne({
      where: {
        id: requestId,
        companyId: config.context.companyId,
      },
    });

    if (!serviceRequest) {
      return `Requisição com ID ${requestId} não encontrada.`;
    }

    const updates: Partial<ServiceRequest> = {};

    if (status) updates.status = status as any;
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (scheduledFor) updates.scheduledFor = scheduledFor;
    if (assignedToUserId) updates.assignedToUserId = assignedToUserId;

    if (internalNotes) {
      updates.internalNotes = serviceRequest.internalNotes
        ? `${serviceRequest.internalNotes}\n\n${internalNotes}`
        : internalNotes;
    }

    await this.serviceRequestRepository.update({ id: requestId }, updates);

    return `Requisição "${serviceRequest.title}" atualizada com sucesso.`;
  }
}
