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
    config: ToolConfig,
  ): Promise<string> {
    this.logger.log('🔧 [TOOL] updateServiceRequest called');
    this.logger.log(`📥 [TOOL] Args: ${JSON.stringify(args)}`);

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
      return `Requisição com ID ${requestId} não encontrada.`;
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

    await this.serviceRequestRepository.update({ id: requestId }, updates);

    const result = `Requisição "${serviceRequest.title}" atualizada com sucesso.`;
    this.logger.log(`✅ [TOOL] ${result}`);
    return result;
  }
}
