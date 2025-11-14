import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AgentState } from '../agents/agent.state';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from 'src/modules/companies/entities/company.entity';
import { Memory } from 'src/modules/chat/entities/memory.entity';
import { LangchainService } from '../services/langchain.service';

const finishOnboardingSchema = z.object({});

@Injectable()
export class FinishOnboardingTool extends StructuredTool {
  private readonly logger = new Logger(FinishOnboardingTool.name);

  name = 'finishOnboarding';
  description =
    'Finaliza o processo de onboarding da empresa, gera uma descrição estruturada com base no histórico da conversa e coloca a empresa no passo "running".';
  schema = finishOnboardingSchema;

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
    _args: z.infer<typeof finishOnboardingSchema>,
    _,
    state: typeof AgentState.State,
  ): Promise<string> {
    const { companyId, userId } = state.context;

    if (!companyId || !userId) {
      throw new Error(
        'finishOnboarding requer companyId e userId no contexto do agente',
      );
    }

    const company = await this.companyRepository.findOneByOrFail({
      id: companyId,
    });

    const memories = await this.memoryRepository.find({
      where: { sessionId: userId },
      order: { createdAt: 'ASC' },
    });

    if (memories.length === 0) {
      await this.companyRepository.update(
        { id: companyId },
        {
          description: `# ${company.name}\n\nDescrição não disponível.`,
          step: 'running',
        },
      );

      return 'Onboarding finalizado, mas nenhum histórico de conversa foi encontrado. A descrição foi preenchida com um texto padrão.';
    }

    const conversationHistory = memories
      .map((m) => {
        const role = m.role === 'user' ? 'Human' : 'AI';
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

    description = description.trim();

    await this.companyRepository.update(
      { id: companyId },
      {
        description,
        step: 'running',
        isClientsSupportEnabled: true,
      },
    );

    return 'Onboarding finalizado com sucesso e empresa marcada como "running".';
  }
}
