import { StructuredTool } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  ConfirmationInteractionPending,
  ConfirmationStatus,
  Confirmation,
} from 'src/modules/service-requests/entities/confirmation.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentState } from '../agents/agent.state';

const confirmationStatusValues: [ConfirmationStatus, ...ConfirmationStatus[]] =
  [ConfirmationStatus.ACTIVE, ConfirmationStatus.CLOSED];

const confirmationInteractionValues: [
  ConfirmationInteractionPending,
  ...ConfirmationInteractionPending[],
] = [
  ConfirmationInteractionPending.USER,
  ConfirmationInteractionPending.CONTACT,
];

const searchConfirmationSchema = z.object({
  id: z.uuid().optional().describe('ID específico da confirmação a buscar'),
  userId: z
    .uuid()
    .optional()
    .describe('Filtra confirmações pelo proprietário responsável'),
  contactId: z
    .uuid()
    .optional()
    .describe('Filtra confirmações pelo contato envolvido'),
  status: z
    .optional(z.enum(confirmationStatusValues))
    .describe('Status das confirmações (active ou closed)'),
  interactionPending: z
    .optional(z.enum(confirmationInteractionValues))
    .describe(
      'Quem deve interagir: "user" (proprietário) ou "contact" (cliente)',
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe('Número máximo de confirmações a retornar (padrão: 20)'),
});

@Injectable()
export class SearchConfirmationTool extends StructuredTool {
  name = 'searchConfirmation';
  description =
    'Busca confirmações existentes utilizando filtros como status, responsável pendente ou contato. Use para entender o estado atual das confirmações.';
  schema = searchConfirmationSchema;

  constructor(
    @InjectRepository(Confirmation)
    private readonly confirmationRepository: Repository<Confirmation>,
  ) {
    super();
  }

  protected async _call(
    args: z.infer<typeof searchConfirmationSchema>,
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

    const qb = this.confirmationRepository
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
      `${sessions.length} Confirmações encontradas: \n` +
      sessions
        .map(
          (session) =>
            `id: ${session.id} | userId: ${session.userId} | contactId: ${session.contactId} | status: ${session.status} | interactionPending: ${session.interactionPending} | description: ${session.description} | expectedResult: ${session.expectedResult} | createdAt: ${Intl.DateTimeFormat('pt-BR').format(session.createdAt)}`,
        )
        .join('\n')
    );
  }
}
