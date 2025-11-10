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
import { Pool } from 'pg';
import {
  CreateServiceRequestTool,
  QueryServiceRequestTool,
  UpdateServiceRequestTool,
  SendMessageTool,
  SearchConversationTool,
  SearchContactTool,
  CreateContactTool,
  UpdateContactTool,
  UpdateCompanyTool,
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
  private pool: Pool;

  constructor(
    private configService: ConfigService,
    private createServiceRequestTool: CreateServiceRequestTool,
    private queryServiceRequestTool: QueryServiceRequestTool,
    private updateServiceRequestTool: UpdateServiceRequestTool,
    private sendMessageTool: SendMessageTool,
    private searchConversationTool: SearchConversationTool,
    private searchContactTool: SearchContactTool,
    private createContactTool: CreateContactTool,
    private updateContactTool: UpdateContactTool,
    private updateCompanyTool: UpdateCompanyTool,
  ) {
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');

    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not defined in environment variables');
    }

    this.model = new ChatGoogleGenerativeAI({
      apiKey,
      model: 'gemini-2.5-flash-lite',
      temperature: 0.7,
      maxOutputTokens: 4096,
    });

    // Initialize PostgreSQL connection pool
    this.pool = new Pool({
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 5432),
      user: this.configService.get<string>('DB_USERNAME', 'postgres'),
      password: this.configService.get<string>('DB_PASSWORD', 'postgres'),
      database: this.configService.get<string>('DB_DATABASE', 'postgres'),
    });
  }

  async onModuleInit() {
    this.logger.log('🔌 Initializing PostgresSaver checkpointer...');

    // Initialize PostgresSaver with connection string and schema option
    this.checkpointer = PostgresSaver.fromConnString(
      `postgresql://${this.configService.get<string>('DB_USERNAME', 'postgres')}:${this.configService.get<string>('DB_PASSWORD', 'postgres')}@${this.configService.get<string>('DB_HOST', 'localhost')}:${this.configService.get<number>('DB_PORT', 5432)}/${this.configService.get<string>('DB_DATABASE', 'postgres')}`,
      { schema: 'checkpointer' }, // Schema is passed here as an option
    );

    // Setup creates the necessary tables (no arguments)
    await this.checkpointer.setup();

    this.logger.log('✅ PostgresSaver initialized with schema: checkpointer');

    // Initialize the graph after checkpointer is ready
    this.initializeGraph();
  }

  /**
   * Initialize the LangGraph workflow
   */
  private initializeGraph() {
    const tools = this.getTools();

    // Create a custom tool node that passes context to tools
    const toolNode = async (state: typeof AgentState.State) => {
      const toolCalls =
        (state.messages[state.messages.length - 1] as AIMessage).tool_calls ||
        [];

      const toolMessages = await Promise.all(
        toolCalls.map(async (toolCall) => {
          const tool = tools.find((t) => t.name === toolCall.name);
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
            console.log('🔧 [TOOL] Context:', state.context);
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
      this.logger.log('🎯 [TASK] Calling model...');
      this.logger.log(
        `📊 [TASK] Current messages count: ${state.messages.length}`,
      );

      const systemMessage = this.buildSystemPrompt();
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

      const aiMessage = response as AIMessage;
      if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
        this.logger.log(
          `🛠️  [TASK] Model requested ${aiMessage.tool_calls.length} tool calls:`,
        );
        aiMessage.tool_calls.forEach((tc, idx) => {
          this.logger.log(
            `   ${idx + 1}. ${tc.name}(${JSON.stringify(tc.args)})`,
          );
        });
      } else {
        this.logger.log(
          '💭 [TASK] Model generated final response (no tool calls)',
        );
      }

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
      this.queryServiceRequestTool,
      this.updateServiceRequestTool,
      this.sendMessageTool,
      this.searchConversationTool,
      this.searchContactTool,
      this.createContactTool,
      this.updateContactTool,
      this.updateCompanyTool,
    ];
  }

  /**
   * Build the system prompt for the agent
   */
  private buildSystemPrompt(): string {
    return `Você é uma secretária executiva virtual altamente eficiente e proativa.

## PERSONA
- Profissional, organizada e atenciosa
- Tom cordial mas direto ao ponto
- Antecipa necessidades e sugere ações
- Mantém o proprietário informado de forma clara
- Utilize o nome do proprietário quando apropriado

## SUAS RESPONSABILIDADES
Você auxilia o proprietário com:
- Informações sobre agendamentos e requisições de serviço
- Busca de dados de clientes e conversas
- Envio de mensagens para clientes ou funcionários
- Gerenciamento de informações da empresa
- Criação e atualização de contatos e requisições

## FERRAMENTAS DISPONÍVEIS
Você tem acesso a várias ferramentas para executar ações. Use-as quando apropriado:
- Para buscar informações: use as ferramentas de consulta e busca
- Para executar ações: use as ferramentas de criação e atualização
- Para comunicação: use a ferramenta de envio de mensagens

## DIRETRIZES
1. Seja proativa em sugerir ações relevantes
2. Use as ferramentas disponíveis para executar tarefas solicitadas
3. Forneça informações de forma estruturada e clara
4. Priorize eficiência e clareza nas respostas
5. Destaque informações urgentes ou importantes
6. Se precisar de mais informações, pergunte ao usuário

## FORMATO DE RESPOSTA
- Seja concisa mas completa
- Use formatação quando apropriado (listas, negrito)
- Sempre confirme ações executadas
- Sugira próximos passos quando relevante`;
  }
}
