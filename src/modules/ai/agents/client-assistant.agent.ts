import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { END, START, StateGraph } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { Contact } from 'src/modules/contacts/entities/contact.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  CreateServiceRequestTool,
  SearchConversationTool,
  SearchServiceRequestTool,
  UpdateServiceRequestTool,
  SearchUserTool,
  SendMessageTool,
  CreateConfirmationTool,
  UpdateConfirmationTool,
  SearchConfirmationTool,
  UpdateMemoryTool,
  SearchMemoryTool,
} from '../tools';
import { createClientAssistantNode } from '../nodes/client-assistant.node';
import { createToolNode } from '../nodes/tool.node';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentContext, AgentState } from './agent.state';
import { createDetectTransferNode } from '../nodes/detect-transfer.node';
import { createRequestHumanNode } from '../nodes/request-human.node';
import { PostgresStore } from '../stores/postgres.store';

@Injectable()
export class ClientAssistantAgent implements OnModuleInit {
  private readonly logger = new Logger(ClientAssistantAgent.name);
  private model: ChatGoogleGenerativeAI;
  private checkpointer: PostgresSaver;
  private graph: ReturnType<typeof this.buildGraph>;

  constructor(
    private readonly configService: ConfigService,
    private readonly createServiceRequestTool: CreateServiceRequestTool,
    private readonly searchServiceRequestTool: SearchServiceRequestTool,
    private readonly updateServiceRequestTool: UpdateServiceRequestTool,
    private readonly searchConversationTool: SearchConversationTool,
    private readonly searchUserTool: SearchUserTool,
    private readonly sendMessageTool: SendMessageTool,
    private readonly createConfirmationTool: CreateConfirmationTool,
    private readonly updateConfirmationTool: UpdateConfirmationTool,
    private readonly searchConfirmationTool: SearchConfirmationTool,
    private readonly updateMemoryTool: UpdateMemoryTool,
    private readonly searchMemoryTool: SearchMemoryTool,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly postgresStore: PostgresStore,
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
    this.checkpointer = PostgresSaver.fromConnString(
      `postgresql://${this.configService.get<string>('DB_USERNAME', 'postgres')}:${this.configService.get<string>('DB_PASSWORD', 'postgres')}@${this.configService.get<string>('DB_HOST', 'localhost')}:${this.configService.get<number>('DB_PORT', 5432)}/${this.configService.get<string>('DB_DATABASE', 'postgres')}`,
      { schema: 'checkpointer' },
    );

    await this.checkpointer.setup();

    this.graph = this.buildGraph();
  }

  private buildGraph() {
    const shouldContinue = (state: typeof AgentState.State) => {
      const messages = state.messages;
      const lastMessage = messages[messages.length - 1] as AIMessage;

      if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
        return 'end';
      }

      return 'tools';
    };

    const workflow = new StateGraph(AgentState)
      .addNode('detectTransfer', createDetectTransferNode(this.model), {
        ends: ['requestHuman', 'assistant'],
      })
      .addNode(
        'requestHuman',
        createRequestHumanNode(
          this.contactRepository,
          this.userRepository,
          this.sendMessageTool,
        ),
      )
      .addNode(
        'assistant',
        createClientAssistantNode(this.model.bindTools(this.getTools())),
      )
      .addNode('tools', createToolNode(this.getTools()), {
        retryPolicy: {
          logWarning: true,
        },
      })
      .addEdge(START, 'detectTransfer')
      .addEdge('requestHuman', END)
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
    context: AgentContext,
    threadId: string = 'default',
  ) {
    const config = {
      configurable: {
        thread_id: threadId,
        context,
      },
    };

    return await this.graph.stream(
      {
        messages: [new HumanMessage(message)],
        context,
      },
      config,
    );
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

  private getTools(): StructuredTool[] {
    return [
      this.createServiceRequestTool,
      this.searchServiceRequestTool,
      this.updateServiceRequestTool,
      this.searchConversationTool,
      this.searchUserTool,
      this.sendMessageTool,
      this.createConfirmationTool,
      this.updateConfirmationTool,
      this.searchConfirmationTool,
      this.updateMemoryTool,
      this.searchMemoryTool,
    ];
  }
}
