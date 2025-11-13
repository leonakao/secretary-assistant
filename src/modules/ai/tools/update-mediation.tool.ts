import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import {
  MediationInteractionPending,
  MediationStatus,
  Mediation,
} from 'src/modules/service-requests/entities/mediation.entity';

const updateMediationSchema = z.object({
  mediationId: z.uuid().describe('Identificador da mediação a ser atualizada'),
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
    .describe('Atualiza o status da mediação'),
  metadata: z
    .object({})
    .catchall(z.any())
    .nullable()
    .optional()
    .describe('Metadados adicionais a serem definidos na mediação'),
});

@Injectable()
export class UpdateMediationTool extends StructuredTool {
  private readonly logger = new Logger(UpdateMediationTool.name);

  name = 'updateMediation';
  description =
    'Atualiza campos de uma mediação existente (descrição, resultado esperado, responsável pendente, status, metadados).';
  schema = updateMediationSchema;

  constructor(
    @InjectRepository(Mediation)
    private readonly mediationRepository: Repository<Mediation>,
  ) {
    super();
  }

  protected async _call(
    args: z.infer<typeof updateMediationSchema>,
  ): Promise<string> {
    const mediation = await this.mediationRepository.findOne({
      where: { id: args.mediationId },
    });

    if (!mediation) {
      throw new Error(
        `Mediation session with ID ${args.mediationId} was not found`,
      );
    }

    if (args.description) {
      mediation.description = args.description;
    }

    if (args.expectedResult) {
      mediation.expectedResult = args.expectedResult;
    }

    if (args.interactionPending) {
      mediation.interactionPending =
        args.interactionPending === 'user'
          ? MediationInteractionPending.USER
          : MediationInteractionPending.CONTACT;
    }

    if (args.status) {
      mediation.status =
        args.status === 'active'
          ? MediationStatus.ACTIVE
          : MediationStatus.CLOSED;
    }

    if (args.metadata !== undefined) {
      mediation.metadata = args.metadata;
    }

    await this.mediationRepository.save(mediation);

    this.logger.log(`✅ [TOOL] Mediation updated: ${mediation.id}`);

    return JSON.stringify(
      {
        success: true,
        mediation: {
          id: mediation.id,
          companyId: mediation.companyId,
          userId: mediation.userId,
          contactId: mediation.contactId,
          status: mediation.status,
          interactionPending: mediation.interactionPending,
          description: mediation.description,
          expectedResult: mediation.expectedResult,
          metadata: mediation.metadata,
          createdAt: mediation.createdAt,
          updatedAt: mediation.updatedAt,
        },
      },
      null,
      2,
    );
  }
}
