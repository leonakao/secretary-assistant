import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { ServiceRequest } from 'src/modules/service-requests';
import { AgentState } from '../agents/agent.state';

const queryServiceRequestSchema = z.object({
  contactId: z
    .string()
    .optional()
    .describe('O ID do contato (cliente) para filtrar requisições'),
  userId: z
    .string()
    .optional()
    .describe('O ID do usuário que está responsável pela requisição'),
  requestType: z
    .string()
    .optional()
    .describe('O tipo de requisição para filtrar'),
  status: z
    .string()
    .optional()
    .describe(
      'O status da requisição (pending, in_progress, completed, cancelled)',
    ),
  scheduledForFrom: z
    .string()
    .optional()
    .describe('A data e hora mínima agendada para a requisição'),
  scheduledForTo: z
    .string()
    .optional()
    .describe('A data e hora máxima agendada para a requisição'),
});

@Injectable()
export class SearchServiceRequestTool extends StructuredTool {
  private readonly logger = new Logger(SearchServiceRequestTool.name);

  name = 'queryServiceRequest';
  description =
    'Consulta requisições de serviço. Use para buscar informações sobre agendamentos, pedidos ou tarefas.';
  schema = queryServiceRequestSchema;

  constructor(
    @InjectRepository(ServiceRequest)
    private readonly serviceRequestRepository: Repository<ServiceRequest>,
  ) {
    super();
  }

  protected async _call(
    args: z.infer<typeof queryServiceRequestSchema>,
    _,
    state: typeof AgentState.State,
  ): Promise<string> {
    const { contactId, requestType, status } = args;
    const { companyId } = state.context;

    if (!companyId) {
      throw new Error('Company ID missing in the context');
    }

    const queryBuilder = this.serviceRequestRepository
      .createQueryBuilder('sr')
      .where('sr.companyId = :companyId', {
        companyId,
      });

    if (contactId) {
      queryBuilder.andWhere('sr.contactId = :contactId', { contactId });
    }

    if (requestType) {
      queryBuilder.andWhere('sr.requestType = :requestType', { requestType });
    }

    if (status) {
      queryBuilder.andWhere('sr.status = :status', { status });
    }

    queryBuilder.orderBy('sr.createdAt', 'DESC');

    const serviceRequests = await queryBuilder.getMany();

    const result = {
      success: true,
      count: serviceRequests.length,
      serviceRequests: serviceRequests.map((sr) => ({
        id: sr.id,
        contactId: sr.contactId,
        requestType: sr.requestType,
        title: sr.title,
        description: sr.description,
        status: sr.status,
        scheduledFor: sr.scheduledFor,
        clientNotes: sr.clientNotes,
        internalNotes: sr.internalNotes,
        assignedToUserId: sr.assignedToUserId,
        companyId: sr.companyId,
        createdAt: sr.createdAt,
        updatedAt: sr.updatedAt,
      })),
    };

    return JSON.stringify(result, null, 2);
  }
}
