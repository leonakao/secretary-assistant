import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { CreateMediationService } from 'src/modules/service-requests/services/create-mediation.service';
import { MediationInteractionPending } from 'src/modules/service-requests/entities/mediation.entity';
import { AgentState } from '../agents/agent.state';

const createMediationSchema = z.object({
  description: z
    .string()
    .min(3)
    .describe('Descrição clara do que está acontecendo na mediação'),
  expectedResult: z
    .string()
    .min(3)
    .describe('Resultado esperado ou condição para encerrar a mediação'),
  interactionPending: z
    .enum(Object.values(MediationInteractionPending))
    .describe(
      'Quem deve interagir a seguir: "user" (proprietário/funcionário) ou "contact" (cliente).',
    ),
  userId: z.uuid().optional().describe('ID do usuário responsável'),
  contactId: z.uuid().describe('ID do contato envolvido'),
  metadata: z
    .object({})
    .catchall(z.any())
    .optional()
    .describe('Metadados adicionais em formato JSON'),
});

@Injectable()
export class CreateMediationTool extends StructuredTool {
  private readonly logger = new Logger(CreateMediationTool.name);

  name = 'createMediation';
  description =
    'Cria uma nova mediação entre proprietário e cliente. Use quando precisar iniciar um acompanhamento estruturado até que o resultado esperado seja alcançado. Por exemplo: Caso o cliente faça uma pergunta que você não saiba responder, crie uma mediação para que um usuário auxilie na resposta. A mediação será registrada e o fluxo continuará com o acompanhamento. A mediação pode ser atualizada posteriormente com novas interações.';
  schema = createMediationSchema;

  constructor(private readonly createMediationService: CreateMediationService) {
    super();
  }

  protected async _call(
    args: z.infer<typeof createMediationSchema>,
    _: unknown,
    state: typeof AgentState.State,
  ): Promise<string> {
    const companyId = state.context.companyId;

    if (!companyId) {
      throw new Error('Company ID missing in the context');
    }

    const mediation = await this.createMediationService.execute({
      companyId,
      contactId: args.contactId,
      description: args.description,
      expectedResult: args.expectedResult,
      metadata: args.metadata ?? null,
      interactionPending:
        args.interactionPending as MediationInteractionPending,
      userId: args.userId,
    });

    return `Mediação criada com sucesso: ${mediation.id}`;
  }
}
