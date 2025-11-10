import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { ServiceRequest } from 'src/modules/service-requests';
import { ToolConfig } from '../types';

const queryServiceRequestSchema = z.object({
  contactId: z
    .string()
    .optional()
    .describe('O ID do contato (cliente) para filtrar requisições'),
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
});

@Injectable()
export class QueryServiceRequestTool extends StructuredTool {
  private readonly logger = new Logger(QueryServiceRequestTool.name);

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
    config: ToolConfig,
  ): Promise<string> {
    this.logger.log('🔧 [TOOL] queryServiceRequest called');
    this.logger.log(`📥 [TOOL] Args: ${JSON.stringify(args)}`);

    const { contactId, requestType, status } = args;
    const { companyId } = config.configurable.context;

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

    const requests = await queryBuilder.getMany();

    if (requests.length === 0) {
      return 'Nenhuma requisição de serviço encontrada com os critérios especificados.';
    }

    const summary = requests
      .map((req) => {
        const scheduledInfo = req.scheduledFor
          ? ` - Agendado para: ${req.scheduledFor.toLocaleString('pt-BR')}`
          : '';
        return `- ${req.title || req.requestType} (Status: ${req.status})${scheduledInfo}`;
      })
      .join('\n');

    return `Encontrei ${requests.length} requisição(ões):\n${summary}`;
  }
}
