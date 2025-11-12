import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  MediationInteractionPending,
  MediationStatus,
  Mediation,
} from 'src/modules/service-requests/entities/mediation.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ToolConfig } from '../types';

const mediationStatusValues: [
  MediationStatus,
  ...MediationStatus[],
] = [MediationStatus.ACTIVE, MediationStatus.CLOSED];

const mediationInteractionValues: [
  MediationInteractionPending,
  ...MediationInteractionPending[],
] = [MediationInteractionPending.USER, MediationInteractionPending.CONTACT];

const searchMediationSchema = z.object({
  userId: z
    .uuid()
    .optional()
    .describe('Filtra mediações pelo proprietário responsável'),
  contactId: z
    .uuid()
    .optional()
    .describe('Filtra mediações pelo contato envolvido'),
  status: z
    .optional(z.enum(mediationStatusValues))
    .describe('Status das mediações (active ou closed)'),
  interactionPending: z
    .optional(z.enum(mediationInteractionValues))
    .describe(
      'Quem deve interagir: "user" (proprietário) ou "contact" (cliente)',
    ),
  limit: z
    .number()
    .int()
    .positive()
    .max(50)
    .optional()
    .describe('Número máximo de mediações a retornar (padrão: 20)'),
});

@Injectable()
export class SearchMediationsTool extends StructuredTool {
  private readonly logger = new Logger(SearchMediationsTool.name);

  name = 'searchMediations';
  description =
    'Busca mediações existentes utilizando filtros como status, responsável pendente ou contato. Use para entender o estado atual das mediações.';
  schema = searchMediationSchema;

  constructor(
    @InjectRepository(Mediation)
    private readonly mediationRepository: Repository<Mediation>,
  ) {
    super();
  }

  protected async _call(
    args: z.infer<typeof searchMediationSchema>,
    _runManager?: unknown,
    config?: ToolConfig,
  ): Promise<string> {
    if (!config) {
      throw new Error('Configuração não fornecida para a ferramenta');
    }

    const context = config.configurable.context as { companyId?: string };

    if (!context.companyId) {
      throw new Error('Company ID missing in the context');
    }

    const qb = this.mediationRepository
      .createQueryBuilder('session')
      .where('session.companyId = :companyId', {
        companyId: context.companyId,
      });

    if (args.userId) {
      qb.andWhere('session.userId = :userId', { userId: args.userId });
    }

    if (args.contactId) {
      qb.andWhere('session.contactId = :contactId', {
        contactId: args.contactId,
      });
    }

    if (args.status) {
      qb.andWhere('session.status = :status', { status: args.status });
    }

    if (args.interactionPending) {
      qb.andWhere('session.interactionPending = :interactionPending', {
        interactionPending: args.interactionPending,
      });
    }

    qb.orderBy('session.createdAt', 'DESC');

    const sessions = await qb.getMany();

    const limitedSessions = args.limit
      ? sessions.slice(0, args.limit)
      : sessions.slice(0, 20);

    this.logger.log(
      `✅ [TOOL] Found ${limitedSessions.length} mediation(s) (requested limit: ${args.limit ?? 20})`,
    );

    return JSON.stringify(
      {
        success: true,
        total: sessions.length,
        returned: limitedSessions.length,
        mediations: limitedSessions.map((session) => ({
          id: session.id,
          companyId: session.companyId,
          userId: session.userId,
          contactId: session.contactId,
          status: session.status,
          interactionPending: session.interactionPending,
          description: session.description,
          expectedResult: session.expectedResult,
          metadata: session.metadata,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        })),
      },
      null,
      2,
    );
  }
}
