import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { CreateConfirmationService } from 'src/modules/service-requests/services/create-confirmation.service';
import { ConfirmationInteractionPending } from 'src/modules/service-requests/entities/confirmation.entity';
import { AgentState } from '../agents/agent.state';

const createConfirmationSchema = z.object({
  description: z
    .string()
    .min(3)
    .describe('Descrição clara do que está acontecendo na confirmação'),
  expectedResult: z
    .string()
    .min(3)
    .describe('Resultado esperado ou condição para encerrar a confirmação'),
  interactionPending: z
    .enum(Object.values(ConfirmationInteractionPending))
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
export class CreateConfirmationTool extends StructuredTool {
  private readonly logger = new Logger(CreateConfirmationTool.name);

  name = 'createConfirmation';
  description =
    'Cria uma nova confirmação entre proprietário e cliente. Use quando precisar registrar uma confirmação estruturada até que o resultado esperado seja alcançado. Por exemplo: Caso o cliente faça uma pergunta que você não saiba responder, crie uma confirmação para que um usuário auxilie na resposta. A confirmação será registrada e o fluxo continuará com o acompanhamento. A confirmação pode ser atualizada posteriormente com novas interações.';
  schema = createConfirmationSchema;

  constructor(
    private readonly createConfirmationService: CreateConfirmationService,
  ) {
    super();
  }

  protected async _call(
    args: z.infer<typeof createConfirmationSchema>,
    _: unknown,
    state: typeof AgentState.State,
  ): Promise<string> {
    const companyId = state.context.companyId;

    if (!companyId) {
      throw new Error('Company ID missing in the context');
    }

    const confirmation = await this.createConfirmationService.execute({
      companyId,
      contactId: args.contactId,
      description: args.description,
      expectedResult: args.expectedResult,
      metadata: args.metadata ?? null,
      interactionPending:
        args.interactionPending as ConfirmationInteractionPending,
      userId: args.userId,
    });

    return `Confirmação criada com sucesso: ${confirmation.id}`;
  }
}
