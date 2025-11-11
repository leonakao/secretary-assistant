import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { ToolConfig } from '../types';
import {
  MediationInteractionPending,
  MediationSession,
  MediationSessionStatus,
} from 'src/modules/service-requests/entities/mediation-session.entity';

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
    .enum(['user', 'contact'])
    .describe(
      'Quem deve interagir a seguir: "user" (proprietário/funcionário) ou "contact" (cliente).',
    ),
  userId: z
    .uuid()
    .describe('ID do proprietário responsável (usa o contexto por padrão)'),
  contactId: z
    .uuid()
    .describe('ID do contato envolvido (usa o contexto do cliente por padrão)'),
  metadata: z
    .record(z.string(), z.any())
    .optional()
    .describe('Metadados adicionais em formato JSON'),
});

@Injectable()
export class CreateMediationTool extends StructuredTool {
  private readonly logger = new Logger(CreateMediationTool.name);

  name = 'createMediation';
  description =
    'Cria uma nova mediação entre proprietário e cliente. Use quando precisar iniciar um acompanhamento estruturado até que o resultado esperado seja alcançado.';
  schema = createMediationSchema;

  constructor(
    @InjectRepository(MediationSession)
    private readonly mediationRepository: Repository<MediationSession>,
  ) {
    super();
  }

  protected async _call(
    args: z.infer<typeof createMediationSchema>,
    _: unknown,
    config: ToolConfig,
  ): Promise<string> {
    const companyId = config.configurable.context.companyId;

    if (!companyId) {
      throw new Error('Company ID missing in the context');
    }

    const interactionPending = args.interactionPending
      ? args.interactionPending === 'user'
        ? MediationInteractionPending.USER
        : MediationInteractionPending.CONTACT
      : undefined;

    const mediation = this.mediationRepository.create({
      companyId,
      userId: args.userId,
      contactId: args.contactId,
      description: args.description,
      expectedResult: args.expectedResult,
      interactionPending:
        interactionPending ?? MediationInteractionPending.CONTACT,
      status: MediationSessionStatus.ACTIVE,
      metadata: args.metadata ?? null,
    });

    await this.mediationRepository.save(mediation);

    this.logger.log(`✅ [TOOL] Mediation created: ${mediation.id}`);

    return JSON.stringify(
      {
        success: true,
        mediation: {
          id: mediation.id,
          companyId: mediation.companyId,
          userId: mediation.userId,
          contactId: mediation.contactId,
          interactionPending: mediation.interactionPending,
          description: mediation.description,
          expectedResult: mediation.expectedResult,
          status: mediation.status,
          createdAt: mediation.createdAt,
          updatedAt: mediation.updatedAt,
        },
      },
      null,
      2,
    );
  }
}
