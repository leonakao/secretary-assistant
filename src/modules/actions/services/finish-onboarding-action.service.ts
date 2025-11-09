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
          const role = m.role === 'user' ? 'User' : 'AI';
          return `${role}: ${m.content}`;
        })
        .join('\n');

      const prompt = `Extraia e organize as informações da conversa em Markdown estruturado.

IMPORTANTE: Comece DIRETO com o título # [Nome da Empresa], sem texto introdutório.

Seções (inclua apenas se houver informação):
# [Nome da Empresa]
## Sobre a Empresa
## Informações de Contato
## Horário de Atendimento
## Área de Atendimento
## Preços e Formas de Pagamento
## Tempo de Entrega/Atendimento
## Agendamento
## Política de Cancelamento
## Perguntas Frequentes
## Diferenciais
## Outras Informações

Regras:
- Comece DIRETO com # [Nome da Empresa]
- Use listas com - para múltiplos itens
- Seja objetivo e direto
- Não adicione informações que não estão na conversa
- Complete TODAS as seções até o final

CONVERSA:
${conversationHistory}

MARKDOWN:`;

      let description = await this.langchainService.chat(prompt, 8192);

      const markdownStart = description.indexOf('# ');
      if (markdownStart > 0) {
        description = description.substring(markdownStart);
      }

      return description.trim();
    } catch (error) {
      this.logger.error('Error generating description from history:', error);
      return `# ${companyName}\n\nErro ao gerar descrição.`;
    }
  }
}
