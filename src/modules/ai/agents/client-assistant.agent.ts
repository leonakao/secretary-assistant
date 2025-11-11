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
} from '../tools';

const AgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  context: Annotation<{
    companyId: string;
    instanceName: string;
    contactId: string;
    contactName: string;
    contactPhone?: string;
    companyDescription: string;
  }>(),
});

export interface ClientAgentContext {
  companyId: string;
  instanceName: string;
  contactId: string;
  contactName: string;
  contactPhone?: string;
  companyDescription: string;
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
    const tools = this.getTools();
    const toolByName = tools.reduce(
      (acc, tool) => {
        acc[tool.name] = tool;
        return acc;
      },
      {} as Record<string, StructuredTool>,
    );

    const toolNode = async (state: typeof AgentState.State) => {
      const toolCalls =
        (state.messages[state.messages.length - 1] as AIMessage).tool_calls ||
        [];

      const toolMessages = await Promise.all(
        toolCalls.map(async (toolCall) => {
          const tool = toolByName[toolCall.name];
          if (!tool) {
            return {
              role: 'tool',
              content: `Tool ${toolCall.name} not found`,
              tool_call_id: toolCall.id,
            };
          }

          try {
            this.logger.log(`🔧 [TOOL] Executing tool: ${toolCall.name}`);
            const result = await tool.invoke(toolCall.args, {
              configurable: {
                context: state.context,
              },
            });

            return {
              role: 'tool',
              content: result,
              tool_call_id: toolCall.id,
              name: toolCall.name,
            };
          } catch (error) {
            this.logger.error(`Error executing tool ${toolCall.name}:`, error);
            return {
              role: 'tool',
              content: `Error: ${error.message}`,
              tool_call_id: toolCall.id,
              name: toolCall.name,
            };
          }
        }),
      );

      return { messages: toolMessages };
    };

    const modelWithTools = this.model.bindTools(tools);

    const callModel = async (state: typeof AgentState.State) => {
      this.logger.log('💬 [CLIENT] Invoking model...');

      const systemMessage = this.buildSystemPrompt(state.context);
      const messages = [
        { role: 'system', content: systemMessage },
        ...state.messages,
      ];

      const response = await modelWithTools.invoke(messages, {
        configurable: {
          context: state.context,
        },
      });

      const aiMessage = response as AIMessage;
      if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
        aiMessage.tool_calls.forEach((tc, idx) => {
          this.logger.log(
            `🛠️  [CLIENT] Tool call ${idx + 1}: ${tc.name}(${JSON.stringify(tc.args)})`,
          );
        });
      } else {
        this.logger.log('✅ [CLIENT] Model generated final response');
      }

      return { messages: [response] };
    };

    const shouldContinue = (state: typeof AgentState.State) => {
      const messages = state.messages;
      const lastMessage = messages[messages.length - 1] as AIMessage;

      if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
        return 'end';
      }

      return 'tools';
    };

    const workflow = new StateGraph(AgentState)
      .addNode('agent', callModel)
      .addNode('tools', toolNode)
      .addEdge('__start__', 'agent')
      .addConditionalEdges('agent', shouldContinue, {
        tools: 'tools',
        end: '__end__',
      })
      .addEdge('tools', 'agent');

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

  async *stream(
    message: string,
    contact: Contact,
    context: ClientAgentContext,
    threadId: string = 'default',
  ): AsyncGenerator<string> {
    this.logger.log(
      `📡 [CLIENT] Streaming agent response for contact ${contact.name}: ${message}`,
    );

    const config = {
      configurable: {
        thread_id: threadId,
        context,
      },
    };

    const stream = await this.graph.stream(
      {
        messages: [new HumanMessage(message)],
        context,
      },
      config,
    );

    for await (const chunk of stream) {
      if (chunk.agent) {
        const messages = chunk.agent.messages as BaseMessage[];
        const lastMessage = messages[messages.length - 1];

        if (lastMessage.type === 'ai') {
          const content = (lastMessage as AIMessage).content;
          if (typeof content === 'string') {
            yield content;
          }
        }
      }
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

## PERSONA
- Profissional, cordial e empática
- Fala sempre em português
- Mantém as respostas claras, objetivas e acolhedoras
- Usa um tom de voz humano e natural, evitando jargões técnicos

## RESPONSABILIDADES
- Responder dúvidas sobre produtos, serviços, horários e políticas da empresa
- Coletar informações necessárias para ajudar o cliente
- Registrar solicitações ou atualizações usando as ferramentas disponíveis
- Informar o cliente quando acionar um humano ou quando precisar de mais informações
- Fazer follow-up natural sobre próximos passos

## FERRAMENTAS
- createServiceRequest: registre novas solicitações quando o cliente pedir um serviço ou agendamento
- updateServiceRequest: atualize solicitações existentes com novas informações ou mudanças de status
- searchServiceRequest: consulte solicitações passadas para informar o cliente
- searchUser: encontre funcionários responsáveis ou disponíveis para apoiar o atendimento
- sendMessage: envie mensagens para funcionários ou contatos quando necessário

Sempre que usar uma ferramenta:
1. Leia atentamente o resultado retornado (JSON)
2. Utilize os dados (principalmente IDs) nas próximas etapas
3. Não exponha dados técnicos ou sensíveis para o cliente

## CONTEXTO DO CLIENTE
- Nome: ${context.contactName}
- Telefone: ${context.contactPhone || 'não informado'}

## BOAS PRÁTICAS
- Antes de responder, revise mensagens anteriores para manter contexto
- Se precisar de informações que o cliente não forneceu, faça perguntas diretas e claras
- Se não puder executar algo, explique o motivo e ofereça alternativas
- Sempre pergunte se o cliente precisa de mais alguma ajuda antes de encerrar
- NUNCA mencione IDs técnicos; use descrições amigáveis

Data atual: ${new Date().toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    })}
Horário atual: ${new Date().toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }
}
