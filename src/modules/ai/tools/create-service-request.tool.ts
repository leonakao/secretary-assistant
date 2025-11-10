import { StructuredTool } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ServiceRequest } from 'src/modules/service-requests';
import { Repository } from 'typeorm';
import { z } from 'zod';

const createServiceRequestSchema = z.object({
  contactId: z.string().describe('O ID do contato (cliente)'),
  requestType: z.string().describe('O tipo de requisição'),
  title: z.string().optional().describe('O título da requisição'),
  description: z.string().optional().describe('A descrição da requisição'),
  scheduledFor: z.date().optional().describe('A data e hora agendada'),
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
    config,
  ): Promise<string> {
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

    console.log('Executing createServiceRequestTool', args, config);

    if (!config?.context?.companyId) {
      throw new Error('Company ID missing in the context');
    }

    const serviceRequest = this.serviceRequestRepository.create({
      companyId: config.context.companyId,
      contactId,
      requestType,
      title,
      description,
      scheduledFor,
      clientNotes,
      internalNotes,
      assignedToUserId,
    });

    await this.serviceRequestRepository.save(serviceRequest);

    return `Service request created: ${serviceRequest.title} (${serviceRequest.id})`;
  }
}
