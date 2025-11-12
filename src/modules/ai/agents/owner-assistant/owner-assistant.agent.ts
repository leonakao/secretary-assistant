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
} from '../../tools';
import { createOwnerAssistantNode } from './owner-assistant.node';
import { createToolNode } from '../../nodes/tool.node';

// Define the agent state
export const OwnerAssistantAgentState = Annotation.Root({
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

export interface OwnerAgentContext {
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

    const shouldContinue = (state: typeof OwnerAssistantAgentState.State) => {
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

    const workflow = new StateGraph(OwnerAssistantAgentState)
      .addNode(
        'assistant',
        createOwnerAssistantNode(this.model.bindTools(tools)),
      )
      .addNode('tools', createToolNode(this.getTools()))
      .addEdge('__start__', 'assistant')
      .addConditionalEdges('assistant', shouldContinue, {
        tools: 'tools',
        end: '__end__',
      })
      .addEdge('tools', 'assistant');

    this.graph = workflow.compile({ checkpointer: this.checkpointer });
  }

  /**
   * Execute the agent with the given message and context
   */
  async execute(
    message: string,
    user: User,
    context: OwnerAgentContext,
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
    context: OwnerAgentContext,
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
}
