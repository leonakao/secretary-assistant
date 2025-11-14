import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { END, START, StateGraph } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { User } from 'src/modules/users/entities/user.entity';
import {
  CreateServiceRequestTool,
  SearchServiceRequestTool,
  UpdateServiceRequestTool,
  SendMessageTool,
  SearchConversationTool,
  SearchUserTool,
  CreateConfirmationTool,
  UpdateConfirmationTool,
  SearchConfirmationTool,
} from '../tools';
import { createToolNode } from '../nodes/tool.node';
import { AgentContext, AgentState } from './agent.state';
import { PostgresStore } from '../stores/postgres.store';
import { createAssistantNode } from '../nodes/assistant.node';
import { buildOwnerPromptFromState } from '../agent-prompts/assistant-owner-node';

@Injectable()
export class OwnerAssistantAgent implements OnModuleInit {
  private readonly logger = new Logger(OwnerAssistantAgent.name);
  private model: ChatGoogleGenerativeAI;
  private checkpointer: PostgresSaver;
  private graph: ReturnType<typeof this.buildGraph>;

  constructor(
    private readonly configService: ConfigService,
    private readonly createServiceRequestTool: CreateServiceRequestTool,
    private readonly searchServiceRequestTool: SearchServiceRequestTool,
    private readonly updateServiceRequestTool: UpdateServiceRequestTool,
    private readonly sendMessageTool: SendMessageTool,
    private readonly searchConversationTool: SearchConversationTool,
    private readonly createConfirmationTool: CreateConfirmationTool,
    private readonly updateConfirmationTool: UpdateConfirmationTool,
    private readonly searchConfirmationTool: SearchConfirmationTool,
    private readonly searchUserTool: SearchUserTool,
    private readonly postgresStore: PostgresStore,
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

    this.graph = this.buildGraph();
  }

  /**
   * Build the LangGraph workflow
   */
  private buildGraph() {
    const tools = this.getTools();

    const shouldContinue = (state: typeof AgentState.State) => {
      const messages = state.messages;
      const lastMessage = messages[messages.length - 1] as AIMessage;

      if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
        return 'end';
      }

      return 'tools';
    };

    const workflow = new StateGraph(AgentState)
      .addNode(
        'assistant',
        createAssistantNode(
          this.model.bindTools(tools),
          buildOwnerPromptFromState,
        ),
      )
      .addNode('tools', createToolNode(this.getTools()))
      .addEdge(START, 'assistant')
      .addConditionalEdges('assistant', shouldContinue, {
        tools: 'tools',
        end: END,
      })
      .addEdge('tools', 'assistant');

    return workflow.compile({
      checkpointer: this.checkpointer,
      store: this.postgresStore,
    });
  }

  async streamConversation(
    message: string,
    user: User,
    context: AgentContext,
    threadId: string = 'default',
  ) {
    try {
      this.logger.log(`🚀 Executing agent for user ${user.name}: ${message}`);

      const config = {
        configurable: {
          thread_id: threadId,
          context,
        },
      };

      this.logger.log('📡 Starting stream...');
      this.logger.log(
        `📝 Sending new message to graph (checkpointer will load history for thread: ${threadId})`,
      );

      return await this.graph.stream(
        {
          messages: [new HumanMessage(message)],
          context,
        },
        config,
      );
    } catch (error) {
      this.logger.error('❌ Error creating owner stream:', error);
      throw error;
    }
  }

  async updateState(state: Partial<typeof AgentState.State>, threadId: string) {
    await this.graph.updateState(
      {
        configurable: {
          thread_id: threadId,
        },
      },
      state,
    );
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
      this.createConfirmationTool,
      this.updateConfirmationTool,
      this.searchConfirmationTool,
    ];
  }
}
