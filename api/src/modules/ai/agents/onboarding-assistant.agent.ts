import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { END, START, StateGraph } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { User } from 'src/modules/users/entities/user.entity';
import { CreateServiceRequestTool } from '../tools/create-service-request.tool';
import { SearchServiceRequestTool } from '../tools/search-service-request.tool';
import { UpdateServiceRequestTool } from '../tools/update-service-request.tool';
import { SendMessageTool } from '../tools/send-message.tool';
import { SearchConversationTool } from '../tools/search-conversation.tool';
import { SearchUserTool } from '../tools/search-user.tool';
import { CreateConfirmationTool } from '../tools/create-confirmation.tool';
import { UpdateConfirmationTool } from '../tools/update-confirmation.tool';
import { SearchConfirmationTool } from '../tools/search-confirmation.tool';
import { FinishOnboardingTool } from '../tools/finish-onboarding.tool';
import { createToolNode } from '../nodes/tool.node';
import { AgentContext, AgentState } from './agent.state';
import { PostgresStore } from '../stores/postgres.store';
import { createAssistantNode } from '../nodes/assistant.node';
import { buildOnboardingPromptFromState } from '../agent-prompts/assistant-onboarding';
import { ensureCheckpointerSetup } from './checkpointer-setup';
import { LlmChatModel, LlmModelService } from '../services/llm-model.service';

@Injectable()
export class OnboardingAssistantAgent implements OnModuleInit {
  private readonly logger = new Logger(OnboardingAssistantAgent.name);
  private readonly model: LlmChatModel;
  private checkpointer: PostgresSaver;
  private graph: ReturnType<typeof this.buildGraph>;

  constructor(
    private readonly configService: ConfigService,
    private readonly llmModelService: LlmModelService,
    private readonly createServiceRequestTool: CreateServiceRequestTool,
    private readonly searchServiceRequestTool: SearchServiceRequestTool,
    private readonly updateServiceRequestTool: UpdateServiceRequestTool,
    private readonly sendMessageTool: SendMessageTool,
    private readonly searchConversationTool: SearchConversationTool,
    private readonly createConfirmationTool: CreateConfirmationTool,
    private readonly updateConfirmationTool: UpdateConfirmationTool,
    private readonly searchConfirmationTool: SearchConfirmationTool,
    private readonly searchUserTool: SearchUserTool,
    private readonly finishOnboardingTool: FinishOnboardingTool,
    private readonly postgresStore: PostgresStore,
  ) {
    this.model = this.llmModelService.getLlmModel('user-interaction');
  }

  async onModuleInit() {
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
          buildOnboardingPromptFromState,
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
    this.logger.log(
      `Executing onboarding assistant for user ${user.name}: ${message}`,
    );

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
      this.sendMessageTool,
      this.searchUserTool,
      this.createConfirmationTool,
      this.updateConfirmationTool,
      this.searchConfirmationTool,
      this.finishOnboardingTool,
    ];
  }
}
