import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { END, START, StateGraph } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { User } from 'src/modules/users/entities/user.entity';
import { FinishOnboardingTool } from '../tools/finish-onboarding.tool';
import { createToolNode } from '../nodes/tool.node';
import { AgentContext, AgentState } from './agent.state';
import { PostgresStore } from '../stores/postgres.store';
import { createAssistantNode } from '../nodes/assistant.node';
import { buildOnboardingPromptFromState } from '../agent-prompts/assistant-onboarding';
import { ensureCheckpointerSetup } from './checkpointer-setup';
import { LlmChatModel, LlmModelService } from '../services/llm-model.service';
import { createLangWatchRunnableConfig } from 'src/observability/langwatch';
import { createPolicyGateNode } from '../nodes/policy-gate.node';
import { AgentPolicy } from '../policies/agent-policy.interface';
import { RequireExplicitConfirmationPolicy } from '../policies/require-explicit-confirmation.policy';

@Injectable()
export class OnboardingAssistantAgent implements OnModuleInit {
  private readonly logger = new Logger(OnboardingAssistantAgent.name);
  private readonly model: LlmChatModel;
  private checkpointer: PostgresSaver;
  private graph: ReturnType<typeof this.buildGraph>;

  constructor(
    private readonly configService: ConfigService,
    private readonly llmModelService: LlmModelService,
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

      return 'policyGate';
    };

    const workflow = new StateGraph(AgentState)
      .addNode(
        'assistant',
        createAssistantNode(
          this.model.bindTools(tools),
          buildOnboardingPromptFromState,
          this.llmModelService.getObservabilityMetadata(this.model),
        ),
      )
      .addNode('policyGate', createPolicyGateNode(this.getPolicies()), {
        ends: ['assistant', 'tools'],
      })
      .addNode('tools', createToolNode(this.getTools()))
      .addEdge(START, 'assistant')
      .addConditionalEdges('assistant', shouldContinue, {
        policyGate: 'policyGate',
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
    promptRole: 'system' | 'user' = 'user',
  ) {
    this.logger.log(
      `Executing onboarding assistant for user ${user.name}: ${message}`,
    );

    const config = createLangWatchRunnableConfig(
      {
        configurable: {
          thread_id: threadId,
          context,
        },
      },
      {
        companyId: context.companyId,
        instanceName: context.instanceName,
        operation: 'onboarding_assistant_graph_stream',
        threadId,
        userId: context.userId,
      },
    );

    return await this.graph.stream(
      {
        messages: [
          promptRole === 'system'
            ? new SystemMessage(message)
            : new HumanMessage(message),
        ],
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
    return [this.finishOnboardingTool];
  }

  private getPolicies(): AgentPolicy[] {
    return [new RequireExplicitConfirmationPolicy('finishOnboarding')];
  }
}
