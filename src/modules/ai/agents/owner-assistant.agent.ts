import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import {
  StateGraph,
  MessagesAnnotation,
  Annotation,
} from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { User } from 'src/modules/users/entities/user.entity';
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
    companyDescription: string;
  }>(),
});

export interface AgentContext {
  companyId: string;
  instanceName: string;
  userId: string;
  companyDescription: string;
}

@Injectable()
export class OwnerAssistantAgent {
  private readonly logger = new Logger(OwnerAssistantAgent.name);
  private model: ChatGoogleGenerativeAI;
  private checkpointer: MemorySaver;
  private graph: any;

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
      model: 'gemini-2.0-flash-exp',
      temperature: 0.7,
      maxOutputTokens: 4096,
    });

    this.checkpointer = new MemorySaver();
    this.initializeGraph();
  }

  /**
   * Initialize the LangGraph workflow
   */
  private initializeGraph() {
    const tools = this.getTools();
    const toolNode = new ToolNode(tools);

    const modelWithTools = this.model.bindTools(tools);

    const callModel = async (state: typeof AgentState.State) => {
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
      this.logger.log(`Executing agent for user ${user.name}: ${message}`);

      const config = {
        configurable: {
          thread_id: threadId,
          context,
        },
      };

      const result = await this.graph.invoke(
        {
          messages: [new HumanMessage(message)],
          context,
        },
        config,
      );

      const messages = result.messages as BaseMessage[];
      const lastMessage = messages[messages.length - 1];

      if (lastMessage.type === 'ai') {
        return (lastMessage as AIMessage).content as string;
      }

      return 'Desculpe, não consegui processar sua mensagem.';
    } catch (error) {
      this.logger.error('Error executing owner agent:', error);
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
  private buildSystemPrompt(context: AgentContext): string {
    return `Você é uma secretária executiva virtual altamente eficiente e proativa.

## PERSONA
- Profissional, organizada e atenciosa
- Tom cordial mas direto ao ponto
- Antecipa necessidades e sugere ações
- Mantém o proprietário informado de forma clara

## CONTEXTO DA EMPRESA
${context.companyDescription}

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
