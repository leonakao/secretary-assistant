import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { END, START, StateGraph } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { Contact } from 'src/modules/contacts/entities/contact.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { CreateServiceRequestTool } from '../tools/create-service-request.tool';
import { SearchConversationTool } from '../tools/search-conversation.tool';
import { SearchServiceRequestTool } from '../tools/search-service-request.tool';
import { UpdateServiceRequestTool } from '../tools/update-service-request.tool';
import { SearchUserTool } from '../tools/search-user.tool';
import { SendMessageTool } from '../tools/send-message.tool';
import { CreateConfirmationTool } from '../tools/create-confirmation.tool';
import { UpdateConfirmationTool } from '../tools/update-confirmation.tool';
import { SearchConfirmationTool } from '../tools/search-confirmation.tool';
import { UpdateMemoryTool } from '../tools/update-memory.tool';
import { SearchMemoryTool } from '../tools/search-memory.tool';
import { createToolNode } from '../nodes/tool.node';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentContext, AgentState } from './agent.state';
import { createDetectTransferNode } from '../nodes/detect-transfer.node';
import { createRequestHumanNode } from '../nodes/request-human.node';
import { PostgresStore } from '../stores/postgres.store';
import { createAssistantNode } from '../nodes/assistant.node';
import { buildClientPromptFromState } from '../agent-prompts/assistant-client';
import { ensureCheckpointerSetup } from './checkpointer-setup';
import { LlmChatModel, LlmModelService } from '../services/llm-model.service';
import { createLangWatchRunnableConfig } from 'src/observability/langwatch';

@Injectable()
export class ClientAssistantAgent implements OnModuleInit {
  private readonly logger = new Logger(ClientAssistantAgent.name);
  private readonly helperModel: LlmChatModel;
  private readonly userInteractionModel: LlmChatModel;
  private checkpointer: PostgresSaver;
  private graph: ReturnType<typeof this.buildGraph>;

  constructor(
    private readonly configService: ConfigService,
    private readonly llmModelService: LlmModelService,
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
    this.helperModel = this.llmModelService.getLlmModel('helper');
    this.userInteractionModel =
      this.llmModelService.getLlmModel('user-interaction');
  }

  async onModuleInit(): Promise<void> {
    const connectionString = `postgresql://${this.configService.get<string>('DB_USERNAME', 'postgres')}:${this.configService.get<string>('DB_PASSWORD', 'postgres')}@${this.configService.get<string>('DB_HOST', 'localhost')}:${this.configService.get<number>('DB_PORT', 5432)}/${this.configService.get<string>('DB_DATABASE', 'postgres')}`;

    this.checkpointer = PostgresSaver.fromConnString(connectionString, {
      schema: 'checkpointer',
    });

    await ensureCheckpointerSetup(`${connectionString}|checkpointer`, () =>
      this.checkpointer.setup(),
    );

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
      .addNode(
        'detectTransfer',
        createDetectTransferNode(
          this.helperModel,
          this.llmModelService.getObservabilityMetadata(this.helperModel),
        ),
        {
          ends: ['requestHuman', 'assistant'],
        },
      )
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
        createAssistantNode(
          this.userInteractionModel.bindTools(this.getTools()),
          buildClientPromptFromState,
          this.llmModelService.getObservabilityMetadata(
            this.userInteractionModel,
          ),
        ),
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
    const config = createLangWatchRunnableConfig(
      {
        configurable: {
          thread_id: threadId,
          context,
        },
      },
      {
        companyId: context.companyId,
        contactId: context.contactId,
        instanceName: context.instanceName,
        operation: 'client_assistant_graph_stream',
        threadId,
        userId: context.userId,
      },
    );

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
