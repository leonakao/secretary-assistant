import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import {
  ConfirmationInteractionPending,
  ConfirmationStatus,
  Confirmation,
} from 'src/modules/service-requests/entities/confirmation.entity';

const updateConfirmationSchema = z.object({
  confirmationId: z
    .uuid()
    .describe('Identificador da confirmação a ser atualizada'),
  description: z
    .string()
    .min(3)
    .optional()
    .describe('Nova descrição do que está acontecendo'),
  expectedResult: z
    .string()
    .min(3)
    .optional()
    .describe('Novo resultado esperado ou condição de encerramento'),
  interactionPending: z
    .enum(['user', 'contact'])
    .optional()
    .describe('Atualiza quem deve interagir a seguir'),
  status: z
    .enum(['active', 'closed'])
    .optional()
    .describe('Atualiza o status da confirmação'),
  metadata: z
    .object({})
    .catchall(z.any())
    .nullable()
    .optional()
    .describe('Metadados adicionais a serem definidos na confirmação'),
});

@Injectable()
export class UpdateConfirmationTool extends StructuredTool {
  private readonly logger = new Logger(UpdateConfirmationTool.name);

  name = 'updateConfirmation';
  description =
    'Atualiza campos de uma confirmação existente (descrição, resultado esperado, responsável pendente, status, metadados).';
  schema = updateConfirmationSchema;

  constructor(
    @InjectRepository(Confirmation)
    private readonly confirmationRepository: Repository<Confirmation>,
  ) {
    super();
  }

  protected async _call(
    args: z.infer<typeof updateConfirmationSchema>,
  ): Promise<string> {
    const confirmation = await this.confirmationRepository.findOne({
      where: { id: args.confirmationId },
    });

    if (!confirmation) {
      throw new Error(
        `Confirmation session with ID ${args.confirmationId} was not found`,
      );
    }

    if (args.description) {
      confirmation.description = args.description;
    }

    if (args.expectedResult) {
      confirmation.expectedResult = args.expectedResult;
    }

    if (args.interactionPending) {
      confirmation.interactionPending =
        args.interactionPending === 'user'
          ? ConfirmationInteractionPending.USER
          : ConfirmationInteractionPending.CONTACT;
    }

    if (args.status) {
      confirmation.status =
        args.status === 'active'
          ? ConfirmationStatus.ACTIVE
          : ConfirmationStatus.CLOSED;
    }

    if (args.metadata !== undefined) {
      confirmation.metadata = args.metadata;
    }

    await this.confirmationRepository.save(confirmation);

    return 'Confirmação atualizada com sucesso';
  }
}
