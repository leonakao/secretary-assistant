import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import {
  Annotation,
  MessagesAnnotation,
  StateGraph,
} from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { Contact } from 'src/modules/contacts/entities/contact.entity';
import {
  CreateServiceRequestTool,
  SearchConversationTool,
  SearchServiceRequestTool,
  UpdateServiceRequestTool,
  SearchUserTool,
  SendMessageTool,
} from '../../tools';
import { createClientAssistantNode } from './client-assistant.node';
import { createToolNode } from '../../nodes/tool.node';
import { PendingMediation } from 'src/modules/service-requests/services/mediation.service';
import { createDetectTransferNode } from './detect-transfer.node';
import { createRequestHumanNode } from './request-human.node';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export const ClientAssistantAgentState = Annotation.Root({
  ...MessagesAnnotation.spec,

  context: Annotation<ClientAgentContext>(),
  needsHumanSupport: Annotation<boolean>({
    reducer: (_, newValue) => newValue ?? false,
    default: () => false,
  }),
});

export interface ClientAgentContext {
  companyId: string;
  instanceName: string;
  contactId: string;
  contactName: string;
  contactPhone?: string;
  companyDescription: string;
  mediations: PendingMediation[];
}

@Injectable()
export class ClientAssistantAgent implements OnModuleInit {
  private readonly logger = new Logger(ClientAssistantAgent.name);
  private model: ChatGoogleGenerativeAI;
  private checkpointer: PostgresSaver;
  private graph: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly createServiceRequestTool: CreateServiceRequestTool,
    private readonly searchServiceRequestTool: SearchServiceRequestTool,
    private readonly updateServiceRequestTool: UpdateServiceRequestTool,
    private readonly searchConversationTool: SearchConversationTool,
    private readonly searchUserTool: SearchUserTool,
    private readonly sendMessageTool: SendMessageTool,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');

    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not defined in environment variables');
    }

    this.model = new ChatGoogleGenerativeAI({
      apiKey,
      model: 'gemini-2.5-flash',
      temperature: 0.6,
      maxOutputTokens: 2048,
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(
      '🔌 Initializing PostgresSaver checkpointer for client agent...',
    );

    this.checkpointer = PostgresSaver.fromConnString(
      `postgresql://${this.configService.get<string>('DB_USERNAME', 'postgres')}:${this.configService.get<string>('DB_PASSWORD', 'postgres')}@${this.configService.get<string>('DB_HOST', 'localhost')}:${this.configService.get<number>('DB_PORT', 5432)}/${this.configService.get<string>('DB_DATABASE', 'postgres')}`,
      { schema: 'checkpointer' },
    );

    await this.checkpointer.setup();

    this.logger.log(
      '✅ Client agent checkpointer ready (schema: checkpointer)',
    );

    this.initializeGraph();
  }

  private initializeGraph(): void {
    const shouldContinue = (state: typeof ClientAssistantAgentState.State) => {
      const messages = state.messages;
      const lastMessage = messages[messages.length - 1] as AIMessage;

      if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
        return 'end';
      }

      return 'tools';
    };

    const workflow = new StateGraph(ClientAssistantAgentState)
      .addNode('detectTransfer', createDetectTransferNode(this.model), {
        ends: ['requestHuman', 'assistant'],
      })
      .addNode('requestHuman', createRequestHumanNode(this.contactRepository))
      .addNode(
        'assistant',
        createClientAssistantNode(this.model.bindTools(this.getTools())),
      )
      .addNode('tools', createToolNode(this.getTools()))
      .addEdge('__start__', 'detectTransfer')
      .addEdge('requestHuman', '__end__')
      .addConditionalEdges('assistant', shouldContinue, {
        tools: 'tools',
        end: '__end__',
      })
      .addEdge('tools', 'assistant');

    this.graph = workflow.compile({ checkpointer: this.checkpointer });
  }

  async execute(
    message: string,
    contact: Contact,
    context: ClientAgentContext,
    threadId: string = 'default',
  ): Promise<string> {
    this.logger.log(`🚀 [CLIENT] Executing agent for contact ${contact.name}`);

    try {
      const config = {
        configurable: {
          thread_id: threadId,
          context,
        },
      };

      let finalResponse = '';

      const stream = await this.graph.stream(
        {
          messages: [new HumanMessage(message)],
          context,
        },
        config,
      );

      let chunkIndex = 0;
      for await (const chunk of stream) {
        chunkIndex += 1;

        if (chunk.agent) {
          const messages = chunk.agent.messages as BaseMessage[];
          const lastMessage = messages[messages.length - 1];

          if (lastMessage.type === 'ai') {
            const content = (lastMessage as AIMessage).content;
            if (typeof content === 'string') {
              finalResponse = content;
            }
          }
        }

        if (chunk.tools) {
          this.logger.log(
            `🔄 [CLIENT] Tools node executed (chunk ${chunkIndex})`,
          );
        }
      }

      this.logger.log('✅ [CLIENT] Stream completed');

      return (
        finalResponse || 'Desculpe, não consegui processar sua mensagem agora.'
      );
    } catch (error) {
      this.logger.error('❌ [CLIENT] Error executing agent:', error);
      throw error;
    }
  }

  private getTools(): StructuredTool[] {
    return [
      this.createServiceRequestTool,
      this.searchServiceRequestTool,
      this.updateServiceRequestTool,
      this.searchConversationTool,
      this.searchUserTool,
      this.sendMessageTool,
    ];
  }

  private buildSystemPrompt(context: ClientAgentContext): string {
    return `Você é Julia, secretária virtual da empresa. Você está em uma conversa com o cliente ${context.contactName}.

## CONTEXTO DA EMPRESA
${context.companyDescription || 'Descrição não disponível'}

## SOBRE O SISTEMA
- Usuário (user) é um funcionário ou dono da empresa
- Contato (contact) é um cliente da empresa
- Empresa (company) é a empresa do usuário, na qual você é a secretária
- Solicitação (service_request) é um serviço solicitado pelo contato (cliente)
- Conversa (conversation) é uma conversa entre o usuário ou contato com você, representando a empresa.
- Mediação (mediation) é um processo criado quando você precisa negociar com um usuário antes de fazer algo.

## PERSONA
- Profissional, cordial e empática
- Fala sempre em português
- Mantém as respostas claras, objetivas e acolhedoras
- Usa um tom de voz humano e natural, evitando jargões técnicos

## RESPONSABILIDADES
- Responder dúvidas sobre produtos, serviços, horários e políticas da empresa
- Coletar informações necessárias para ajudar o cliente
- Registrar solicitações ou atualizações usando as ferramentas disponíveis
- Participar de mediações em andamento, atualizando proprietários sobre propostas e respostas
- Informar o cliente quando acionar um humano ou quando precisar de mais informações
- Fazer follow-up natural sobre próximos passos

## FERRAMENTAS
- createServiceRequest: registre novas solicitações quando o cliente pedir um serviço ou agendamento (apenas após mediação e confirmação do responsável)
- updateServiceRequest: atualize solicitações existentes com novas informações ou mudanças de status (apenas após validar que a mediação atingiu o resultado esperado)
- searchServiceRequest: consulte solicitações passadas para informar o cliente
- searchMediations: veja mediações abertas e quem deve responder (user ou contact)
- updateMediation / createMediation: mantenha o histórico da negociação sempre atualizado
- searchUser: encontre funcionários responsáveis ou disponíveis para apoiar o atendimento
- sendMessage: envie mensagens para funcionários ou contatos quando necessário

Sempre que usar uma ferramenta:
1. Leia atentamente o resultado retornado (JSON)
2. Utilize os dados (principalmente IDs) nas próximas etapas
3. Não exponha dados técnicos ou sensíveis para o cliente

## DIRETRIZES
1. **SEMPRE revise as mensagens anteriores da conversa antes de responder**
2. Use o contexto das mensagens anteriores para entender melhor as solicitações
3. Se o usuário se referir a algo mencionado antes ("aquele contato", "a requisição que criamos"), busque nas mensagens anteriores
4. Seja proativa em sugerir ações relevantes
5. Use as ferramentas disponíveis para executar tarefas solicitadas
6. **MEMORIZE os IDs retornados pelas ferramentas e use-os em ações subsequentes**
7. Forneça informações de forma estruturada e clara
8. Priorize eficiência e clareza nas respostas
9. Destaque informações urgentes ou importantes
10. Se precisar de mais informações, pergunte ao usuário
11. Nunca comente sobre termos técnicos ou IDs, sem usar as ferramentas disponíveis
12. Antes de pedir mais informações, tente descobrir as informações necessárias utilizando as ferramentas disponíveis
13. **Quando executar múltiplas ações relacionadas, use os dados retornados pela primeira ação na segunda**

## CONTEXTO DO CLIENTE
- Nome: ${context.contactName}
- ContactId: ${context.contactId}
- Data atual: ${new Date().toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    })}
- Horário atual: ${new Date().toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }
}
