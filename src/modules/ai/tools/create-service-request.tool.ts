import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ServiceRequest } from 'src/modules/service-requests';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { ToolConfig } from '../types';

const createServiceRequestSchema = z.object({
  contactId: z.string().describe('O ID do contato (cliente)'),
  requestType: z.string().describe('O tipo de requisição'),
  title: z.string().optional().describe('O título da requisição'),
  description: z.string().optional().describe('A descrição da requisição'),
  scheduledFor: z
    .string()
    .optional()
    .describe(
      'A data e hora agendada (formato ISO 8601, ex: 2024-11-10T15:30:00)',
    ),
  clientNotes: z
    .string()
    .optional()
    .describe(
      'As notas do cliente, qualquer informação que o cliente queira adicionar ou complementar',
    ),
  internalNotes: z
    .string()
    .optional()
    .describe(
      'As notas internas, informações que usuário ou agente queira adicionar',
    ),
  assignedToUserId: z
    .string()
    .optional()
    .describe(
      'O ID do usuário que é responsável por essa requisição. É quem vai atender o cliente',
    ),
});

@Injectable()
export class CreateServiceRequestTool extends StructuredTool {
  private readonly logger = new Logger(CreateServiceRequestTool.name);

  name = 'createServiceRequestTool';
  description = 'Create a service request';
  schema = createServiceRequestSchema;

  constructor(
    @InjectRepository(ServiceRequest)
    private readonly serviceRequestRepository: Repository<ServiceRequest>,
  ) {
    super();
  }

  protected async _call(
    args: z.infer<typeof createServiceRequestSchema>,
    _,
    config: ToolConfig,
  ): Promise<string> {
    this.logger.log('🔧 [TOOL] createServiceRequest called');
    this.logger.log(`📥 [TOOL] Args: ${JSON.stringify(args)}`);

    const {
      contactId,
      requestType,
      title,
      description,
      scheduledFor,
      clientNotes,
      internalNotes,
      assignedToUserId,
    } = args;

    const { companyId } = config.configurable.context;

    if (!companyId) {
      throw new Error('Company ID missing in the context');
    }

    const serviceRequest = this.serviceRequestRepository.create({
      companyId,
      contactId,
      requestType,
      title,
      description,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      clientNotes,
      internalNotes,
      assignedToUserId,
    });

    await this.serviceRequestRepository.save(serviceRequest);

    const result = `Service request created: ${serviceRequest.title} (${serviceRequest.id})`;
    this.logger.log(`✅ [TOOL] ${result}`);
    return result;
  }
}
