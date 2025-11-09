import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinishOnboardingAction } from '../types/action.types';
import { ActionExecutionResult } from './action-executor.service';
import { Company } from '../../companies/entities/company.entity';
import { Memory } from '../../chat/entities/memory.entity';
import { LangchainService } from '../../ai/services/langchain.service';

@Injectable()
export class FinishOnboardingActionService {
  private readonly logger = new Logger(FinishOnboardingActionService.name);

  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Memory)
    private memoryRepository: Repository<Memory>,
    private langchainService: LangchainService,
  ) {}

  async execute(
    action: FinishOnboardingAction,
    context: {
      companyId: string;
      userId: string;
    },
  ): Promise<ActionExecutionResult> {
    try {
      const company = await this.companyRepository.findOneByOrFail({
        id: context.companyId,
      });

      const structuredDescription = await this.generateDescriptionFromHistory(
        context.userId,
        company.name,
      );

      await this.companyRepository.update(
        { id: context.companyId },
        {
          description: structuredDescription,
          step: 'running',
        },
      );

      this.logger.log(
        `Onboarding completed for company ${company.name} (${context.companyId})`,
      );

      return {
        success: true,
        action,
        message: 'Onboarding completed successfully',
        data: {
          companyId: context.companyId,
          companyName: company.name,
          previousStep: company.step,
          newStep: 'running',
        },
      };
    } catch (error) {
      this.logger.error('Error finishing onboarding:', error);
      return {
        success: false,
        action,
        error: error.message || 'Unknown error',
      };
    }
  }

  private async generateDescriptionFromHistory(
    sessionId: string,
    companyName: string,
  ): Promise<string> {
    try {
      const memories = await this.memoryRepository.find({
        where: { sessionId },
        order: { createdAt: 'ASC' },
      });

      if (memories.length === 0) {
        this.logger.warn('No conversation history found for onboarding');
        return `# ${companyName}\n\nDescrição não disponível.`;
      }

      const conversationHistory = memories
        .map((m) => {
          const role = m.role === 'user' ? 'Proprietário' : 'Julia';
          return `${role}: ${m.content}`;
        })
        .join('\n');

      const prompt = `Você é um assistente que organiza informações de empresas.

Analise a conversa de onboarding abaixo e gere uma descrição estruturada e completa da empresa em formato Markdown.

A descrição deve incluir TODAS as informações coletadas, organizadas nas seguintes seções (quando disponíveis):

1. # [Nome da Empresa] (título principal)
2. ## Sobre a Empresa (descrição dos produtos/serviços)
3. ## Informações de Contato (telefone, e-mail, endereço)
4. ## Horário de Atendimento
5. ## Área de Atendimento (cobertura geográfica)
6. ## Preços e Formas de Pagamento
7. ## Tempo de Entrega/Atendimento
8. ## Agendamento (como funciona, antecedência necessária)
9. ## Política de Cancelamento
10. ## Perguntas Frequentes
11. ## Diferenciais
12. ## Outras informações relevantes

IMPORTANTE:
- Use formatação Markdown apropriada (títulos ##, listas -, negrito **)
- Seja claro, objetivo e profissional
- Inclua TODAS as informações mencionadas na conversa
- Organize as informações de forma lógica e fácil de ler
- Se alguma seção não tiver informação, não a inclua
- Use linguagem natural e fluida

CONVERSA DE ONBOARDING:
${conversationHistory}

DESCRIÇÃO ESTRUTURADA EM MARKDOWN:`;

      const description = await this.langchainService.chat(prompt);

      return description.trim();
    } catch (error) {
      this.logger.error('Error generating description from history:', error);
      return `# ${companyName}\n\nErro ao gerar descrição.`;
    }
  }
}
