import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import {
  StateGraph,
  MessagesAnnotation,
  Annotation,
} from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { User } from 'src/modules/users/entities/user.entity';
import {
  CreateServiceRequestTool,
  SearchServiceRequestTool,
  UpdateServiceRequestTool,
  SendMessageTool,
  SearchConversationTool,
  SearchUserTool,
} from '../tools';

// Define the agent state
const AgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  context: Annotation<{
    companyId: string;
    instanceName: string;
    userId: string;
    userName: string;
    userPhone?: string;
    companyDescription: string;
  }>(),
});

export interface AgentContext {
  companyId: string;
  instanceName: string;
  userId: string;
  userName: string;
  userPhone?: string;
  companyDescription: string;
}

@Injectable()
export class OwnerAssistantAgent implements OnModuleInit {
  private readonly logger = new Logger(OwnerAssistantAgent.name);
  private model: ChatGoogleGenerativeAI;
  private checkpointer: PostgresSaver;
  private graph: any;

  constructor(
    private configService: ConfigService,
    private createServiceRequestTool: CreateServiceRequestTool,
    private searchServiceRequestTool: SearchServiceRequestTool,
    private updateServiceRequestTool: UpdateServiceRequestTool,
    private sendMessageTool: SendMessageTool,
    private searchConversationTool: SearchConversationTool,
    private searchUserTool: SearchUserTool,
  ) {
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');

    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not defined in environment variables');
    }

    this.model = new ChatGoogleGenerativeAI({
      apiKey,
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      maxOutputTokens: 2048,
    });
  }

  async onModuleInit() {
    this.logger.log('🔌 Initializing PostgresSaver checkpointer...');

    this.checkpointer = PostgresSaver.fromConnString(
      `postgresql://${this.configService.get<string>('DB_USERNAME', 'postgres')}:${this.configService.get<string>('DB_PASSWORD', 'postgres')}@${this.configService.get<string>('DB_HOST', 'localhost')}:${this.configService.get<number>('DB_PORT', 5432)}/${this.configService.get<string>('DB_DATABASE', 'postgres')}`,
      { schema: 'checkpointer' }, // Schema is passed here as an option
    );

    await this.checkpointer.setup();

    this.logger.log('✅ PostgresSaver initialized with schema: checkpointer');

    this.initializeGraph();
  }

  /**
   * Initialize the LangGraph workflow
   */
  private initializeGraph() {
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
            console.log('🔧 [TOOL] Executing tool:', toolCall.name);
            console.log('🔧 [TOOL] Args:', toolCall.args);
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
              content: `Erro: ${error.message}`,
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
      this.logger.log('🎯 [TASK] Calling model...');
      this.logger.log(
        `📊 [TASK] Current messages count: ${state.messages.length}`,
      );

      const systemMessage = this.buildSystemPrompt(state.context);
      const messages = [
        { role: 'system', content: systemMessage },
        ...state.messages,
      ];

      this.logger.log('🔄 [TASK] Invoking model with tools...');
      const response = await modelWithTools.invoke(messages, {
        configurable: {
          context: state.context,
        },
      });

      return { messages: [response] };
    };

    const shouldContinue = (state: typeof AgentState.State) => {
      this.logger.log('🔀 [TASK] Evaluating next step...');
      const messages = state.messages;
      const lastMessage = messages[messages.length - 1] as AIMessage;

      if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
        this.logger.log('🏁 [TASK] No tool calls - ending workflow');
        return 'end';
      }

      this.logger.log('➡️  [TASK] Tool calls detected - routing to tools node');
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

  /**
   * Execute the agent with the given message and context
   */
  async execute(
    message: string,
    user: User,
    context: AgentContext,
    threadId: string = 'default',
  ): Promise<string> {
    try {
      this.logger.log(`🚀 Executing agent for user ${user.name}: ${message}`);

      const config = {
        configurable: {
          thread_id: threadId,
          context,
        },
      };

      let finalResponse = '';
      let chunkCount = 0;

      this.logger.log('📡 Starting stream...');
      this.logger.log(
        `📝 Sending new message to graph (checkpointer will load history for thread: ${threadId})`,
      );

      const stream = await this.graph.stream(
        {
          messages: [new HumanMessage(message)],
          context,
        },
        config,
      );

      for await (const chunk of stream) {
        chunkCount++;
        this.logger.log(
          `📦 Chunk ${chunkCount}:`,
          JSON.stringify(chunk, null, 2),
        );

        if (chunk.agent) {
          this.logger.log('🤖 Agent node executed');
          const messages = chunk.agent.messages as BaseMessage[];
          const lastMessage = messages[messages.length - 1];

          if (lastMessage.type === 'ai') {
            const content = (lastMessage as AIMessage).content;
            if (typeof content === 'string') {
              finalResponse = content;
              this.logger.log(`💬 Agent response: ${content}`);
            }
          }
        }

        if (chunk.tools) {
          this.logger.log('🔧 Tools node executed');
        }
      }

      this.logger.log(`✅ Stream completed with ${chunkCount} chunks`);
      this.logger.log(`📝 Final response: ${finalResponse}`);

      return finalResponse || 'Desculpe, não consegui processar sua mensagem.';
    } catch (error) {
      this.logger.error('❌ Error executing owner agent:', error);
      throw error;
    }
  }

  /**
   * Stream the agent execution
   */
  async *stream(
    message: string,
    user: User,
    context: AgentContext,
    threadId: string = 'default',
  ): AsyncGenerator<string> {
    try {
      this.logger.log(`Streaming agent for user ${user.name}: ${message}`);

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
    } catch (error) {
      this.logger.error('Error streaming owner agent:', error);
      throw error;
    }
  }

  /**
   * Get all available tools for the agent
   */
  private getTools(): StructuredTool[] {
    return [
      this.createServiceRequestTool,
      this.searchServiceRequestTool,
      this.updateServiceRequestTool,
      this.searchConversationTool,
      this.sendMessageTool,
      this.searchUserTool,
    ];
  }

  /**
   * Build the system prompt for the agent
   */
  private buildSystemPrompt(context: AgentContext): string {
    return `Seu nome é Julia, e você é uma secretária executiva altamente eficiente e proativa. Você representa a empresa durante conversas com os clientes e atende a chamadas dos usuários / funcionários.

## PERSONA
- Profissional, organizada e atenciosa
- Tom cordial mas direto ao ponto
- Antecipa necessidades e sugere ações
- Mantém o proprietário informado de forma clara
- Utilize o nome do proprietário quando apropriado

## SOBRE O SISTEMA
- Usuário (user) é um funcionário ou dono da empresa
- Contato (contact) é um cliente da empresa
- Empresa (company) é a empresa do usuário, na qual você é a secretária
- Solicitação (service_request) é um serviço solicitado pelo contato (cliente)
- Conversa (conversation) é uma conversa entre o usuário ou contato com você, representando a empresa.
- Mediação (mediation) é um processo criado quando você precisa negociar com o cliente antes de fazer algo.

## SUAS RESPONSABILIDADES
Você auxilia o proprietário com:
- Informações sobre agendamentos, mediações e requisições de serviço
- Condução de mediações entre usuário e cliente antes de executar ações definitivas
- Busca de dados de clientes, conversas e mediações abertas
- Envio de mensagens para clientes ou funcionários
- Gerenciamento de informações da empresa
- Criação e atualização de contatos, mediações e requisições
- Gerenciar compromissos dos funcionários

## FERRAMENTAS DISPONÍVEIS
Você tem acesso a várias ferramentas para executar ações. Use-as quando apropriado:
- Para buscar informações: use as ferramentas de consulta e busca (ex: searchServiceRequest, searchMediations, searchConversation, searchUser)
- Para executar ações: use as ferramentas de criação e atualização (createMediation, updateMediation, createServiceRequest, updateServiceRequest)
- Para comunicação: use a ferramenta de envio de mensagens

**MEDIAÇÃO ANTES DE REQUISIÇÕES**
- Sempre que o usuário solicitar criação ou atualização de um agendamento/serviço (ex: "agende amanhã às 9h"), confirme primeiro a disponibilidade do responsável.
- Se o usuário ou você precisar negociar com o cliente, crie ou atualize uma mediação antes de criar/alterar a service_request.
- Registre na mediação o objetivo (ex.: reagendar reunião para 9h) e o resultado esperado antes de executar ações definitivas.

**IMPORTANTE - USO DE RESULTADOS DE FERRAMENTAS**: 
As ferramentas retornam JSON com dados completos (incluindo IDs). 
Você DEVE usar esses dados retornados em ações subsequentes.

Exemplos de uso correto:
✅ Usuário: "Crie um contato João e depois crie uma requisição para ele"
   1. Criar contato → recebe { "contact": { "id": "abc-123", ... } }
   2. Criar requisição usando contactId: "abc-123"

✅ Usuário: "Agende uma visita com Maria amanhã às 9h"
   1. Verifique se já existe mediação ativa; caso contrário, use createMediation registrando objetivo e expectativa
   2. Confirme disponibilidade do responsável (ex.: via searchUser ou consultar agenda)
   3. Somente após ter confirmação, avance para criar/atualizar a service_request

✅ Usuário: "Busque o contato Maria e envie uma mensagem para ela"
   1. Buscar contato → recebe { "contacts": [{ "id": "xyz-789", ... }] }
   2. Enviar mensagem usando recipientId: "xyz-789"

❌ NUNCA faça isso:
   - Criar contato e depois perguntar "Qual o ID do contato?"
   - Buscar algo e pedir ao usuário para informar o ID
   - Ignorar os dados retornados pelas ferramentas
   - Criar ou atualizar uma service_request sem antes validar disponibilidade e registrar a mediação correspondente

## CONTEXTO DA CONVERSA
Você tem acesso a TODAS as mensagens anteriores desta conversa, incluindo:
- Mensagens do usuário
- Suas respostas anteriores
- Resultados de ferramentas executadas anteriormente

**Use este contexto para:**
- Entender referências como "aquele contato", "a requisição", "ele", "ela"
- Lembrar de IDs e dados mencionados anteriormente
- Manter continuidade na conversa
- Evitar perguntar informações já fornecidas

**Exemplos de uso do contexto:**
✅ Usuário: "Crie um contato João" → Julia cria
   Usuário: "Agora envie uma mensagem para ele"
   Julia: Usa o ID do contato João criado anteriormente

✅ Usuário: "Busque requisições do cliente Maria"
   Usuário: "Atualize a primeira para em andamento"
   Julia: Usa o ID da primeira requisição da busca anterior

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

## FORMATO DE RESPOSTA
- Seja concisa mas completa
- Use formatação quando apropriado (listas, negrito)
- Sempre confirme ações executadas
- Sugira próximos passos quando relevante

## VARIÁVEIS
- Você está falando com ${context.userName}
- Hoje é ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
- Agora são ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}
`;
  }
}
