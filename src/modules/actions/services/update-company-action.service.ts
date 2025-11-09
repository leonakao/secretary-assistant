import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateCompanyAction } from '../types/action.types';
import { ActionExecutionResult } from './action-executor.service';
import { Company } from '../../companies/entities/company.entity';
import { Memory } from '../../chat/entities/memory.entity';
import { LangchainService } from '../../ai/services/langchain.service';

@Injectable()
export class UpdateCompanyActionService {
  private readonly logger = new Logger(UpdateCompanyActionService.name);

  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Memory)
    private memoryRepository: Repository<Memory>,
    private langchainService: LangchainService,
  ) {}

  async execute(
    action: UpdateCompanyAction,
    context: {
      companyId: string;
      userId: string;
    },
  ): Promise<ActionExecutionResult> {
    try {
      const company = await this.companyRepository.findOneByOrFail({
        id: context.companyId,
      });

      const currentDescription = company.description || '';

      this.logger.log(
        `Updating company ${company.name} (${context.companyId}) with request: ${action.payload.updateRequest}`,
      );

      const updatedDescription = await this.generateUpdatedDescription(
        context.userId,
        currentDescription,
        action.payload.updateRequest,
        company.name,
      );

      await this.companyRepository.update(
        { id: context.companyId },
        {
          description: updatedDescription,
        },
      );

      this.logger.log(
        `Company ${company.name} (${context.companyId}) updated successfully`,
      );

      return {
        success: true,
        action,
        message: 'Company information updated successfully',
        data: {
          companyId: context.companyId,
          companyName: company.name,
          updateRequest: action.payload.updateRequest,
        },
      };
    } catch (error) {
      this.logger.error('Error updating company:', error);
      return {
        success: false,
        action,
        error: error.message || 'Unknown error',
      };
    }
  }

  private async generateUpdatedDescription(
    sessionId: string,
    currentDescription: string,
    updateRequest: string,
    companyName: string,
  ): Promise<string> {
    const recentMemories = await this.memoryRepository.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const recentConversation = recentMemories
      .reverse()
      .map((m) => {
        const role = m.role === 'user' ? 'User' : 'AI';
        return `${role}: ${m.content}`;
      })
      .join('\n');

    const prompt = `Você é um assistente que atualiza informações de empresas.

Você receberá:
1. A descrição atual da empresa em formato Markdown
2. Uma solicitação de atualização do proprietário
3. O contexto da conversa recente

Sua tarefa é gerar uma NOVA descrição completa da empresa que incorpore as mudanças solicitadas.

TIPOS DE ATUALIZAÇÃO:
- **ADICIONAR**: Incluir novas informações mantendo as existentes
- **MODIFICAR**: Alterar informações existentes
- **REMOVER**: Excluir informações específicas

REGRAS IMPORTANTES:
- Mantenha o formato Markdown com títulos ## e formatação apropriada
- Preserve TODAS as informações que não foram solicitadas para mudança
- Se for adicionar, integre naturalmente ao conteúdo existente
- Se for modificar, atualize apenas a seção relevante
- Se for remover, exclua apenas o que foi solicitado
- Mantenha a estrutura organizada e profissional
- Use linguagem clara e objetiva

DESCRIÇÃO ATUAL DA EMPRESA:
${currentDescription || `# ${companyName}\n\nNenhuma descrição disponível ainda.`}

SOLICITAÇÃO DE ATUALIZAÇÃO:
${updateRequest}

CONTEXTO DA CONVERSA RECENTE:
${recentConversation}

NOVA DESCRIÇÃO COMPLETA EM MARKDOWN:`;

    const updatedDescription = await this.langchainService.chat(prompt, 8192);

    return updatedDescription.trim();
  }
}
