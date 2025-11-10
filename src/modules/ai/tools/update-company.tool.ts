import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { Company } from 'src/modules/companies/entities/company.entity';
import { Memory } from 'src/modules/chat/entities/memory.entity';
import { LangchainService } from '../services/langchain.service';
import { ToolConfig } from '../types';

const updateCompanySchema = z.object({
  updateRequest: z
    .string()
    .describe(
      'Descrição da atualização a ser feita nas informações da empresa',
    ),
});

@Injectable()
export class UpdateCompanyTool extends StructuredTool {
  private readonly logger = new Logger(UpdateCompanyTool.name);

  name = 'updateCompany';
  description =
    'Atualiza informações da empresa (descrição, serviços, horários, etc). Use quando o proprietário quiser adicionar, modificar ou remover informações sobre a empresa.';
  schema = updateCompanySchema;

  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Memory)
    private readonly memoryRepository: Repository<Memory>,
    private readonly langchainService: LangchainService,
  ) {
    super();
  }

  protected async _call(
    args: z.infer<typeof updateCompanySchema>,
    _,
    config: ToolConfig,
  ): Promise<string> {
    this.logger.log('🔧 [TOOL] updateCompany called');
    this.logger.log(`📥 [TOOL] Args: ${JSON.stringify(args)}`);

    const { updateRequest } = args;
    const { companyId, userId } = config.configurable.context;

    if (!companyId || !userId) {
      throw new Error('Context missing required fields: companyId, userId');
    }

    const company = await this.companyRepository.findOneByOrFail({
      id: companyId,
    });

    const currentDescription = company.description || '';

    const updatedDescription = await this.generateUpdatedDescription(
      userId,
      currentDescription,
      updateRequest,
      company.name,
    );

    await this.companyRepository.update(
      { id: companyId },
      { description: updatedDescription },
    );

    return `Informações da empresa "${company.name}" atualizadas com sucesso.`;
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
        const role = m.role === 'user' ? 'Human' : 'AI';
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
