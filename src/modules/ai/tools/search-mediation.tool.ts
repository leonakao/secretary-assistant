import { StructuredTool } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  MediationInteractionPending,
  MediationStatus,
  Mediation,
} from 'src/modules/service-requests/entities/mediation.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentState } from '../agents/agent.state';

const mediationStatusValues: [MediationStatus, ...MediationStatus[]] = [
  MediationStatus.ACTIVE,
  MediationStatus.CLOSED,
];

const mediationInteractionValues: [
  MediationInteractionPending,
  ...MediationInteractionPending[],
] = [MediationInteractionPending.USER, MediationInteractionPending.CONTACT];

const searchMediationSchema = z.object({
  id: z.uuid().optional().describe('ID específico da mediação a buscar'),
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
    .min(1)
    .max(50)
    .optional()
    .describe('Número máximo de mediações a retornar (padrão: 20)'),
});

@Injectable()
export class SearchMediationTool extends StructuredTool {
  name = 'searchMediation';
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
    state?: typeof AgentState.State,
  ): Promise<string> {
    if (!state) {
      throw new Error('Configuração não fornecida para a ferramenta');
    }

    const context = state.context as { companyId?: string };

    if (!context.companyId) {
      throw new Error('Company ID missing in the context');
    }

    const qb = this.mediationRepository
      .createQueryBuilder('session')
      .where('session.companyId = :companyId', {
        companyId: context.companyId,
      });

    if (args.id) {
      qb.andWhere('session.id = :id', { id: args.id });
    }

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

    return (
      `${sessions.length} Mediações encontradas: \n` +
      sessions
        .map(
          (session) =>
            `id: ${session.id} | userId: ${session.userId} | contactId: ${session.contactId} | status: ${session.status} | interactionPending: ${session.interactionPending} | description: ${session.description} | expectedResult: ${session.expectedResult} | createdAt: ${Intl.DateTimeFormat('pt-BR').format(session.createdAt)}`,
        )
        .join('\n')
    );
  }
}
