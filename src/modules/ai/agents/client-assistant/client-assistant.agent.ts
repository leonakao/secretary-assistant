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
  CreateMediationTool,
  UpdateMediationTool,
  SearchMediationTool,
} from '../../tools';
import { createClientAssistantNode } from './client-assistant.node';
import { createToolNode } from '../../nodes/tool.node';
import { PendingMediation } from 'src/modules/service-requests/services/mediation.service';
import { createDetectTransferNode } from './detect-transfer.node';
import { createRequestHumanNode } from './request-human.node';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export const ClientAssistantAgentState = Annotation.Root({
  ...MessagesAnnotation.spec,

  context: Annotation<ClientAgentContext>(),
  needsHumanSupport: Annotation<boolean>({
    reducer: (_, newValue) => newValue ?? false,
    default: () => false,
  }),
  lastInteraction: Annotation<Date>({
    reducer: (_, newValue) => newValue ?? new Date(),
    default: () => new Date(),
  }),
});

export interface ClientAgentContext {
  companyId: string;
  instanceName: string;
  contactId: string;
  contactName: string;
  contactPhone?: string;
  companyDescription: string;
  mediations: PendingMediation[];
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
    private readonly createMediationTool: CreateMediationTool,
    private readonly updateMediationTool: UpdateMediationTool,
    private readonly searchMediationTool: SearchMediationTool,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
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
    const shouldContinue = (state: typeof ClientAssistantAgentState.State) => {
      const messages = state.messages;
      const lastMessage = messages[messages.length - 1] as AIMessage;

      if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
        return 'end';
      }

      return 'tools';
    };

    const workflow = new StateGraph(ClientAssistantAgentState)
      .addNode('detectTransfer', createDetectTransferNode(this.model), {
        ends: ['requestHuman', 'assistant'],
      })
      .addNode('requestHuman', createRequestHumanNode(this.contactRepository))
      .addNode(
        'assistant',
        createClientAssistantNode(this.model.bindTools(this.getTools())),
      )
      .addNode('tools', createToolNode(this.getTools()))
      .addEdge('__start__', 'detectTransfer')
      .addEdge('requestHuman', '__end__')
      .addConditionalEdges('assistant', shouldContinue, {
        tools: 'tools',
        end: '__end__',
      })
      .addEdge('tools', 'assistant');

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

        console.log(
          `CLIENT CHUNK (${chunkIndex}): `,
          JSON.stringify(chunk, null, 2),
        );

        if (chunk.assistant) {
          const messages = chunk.assistant.messages as BaseMessage[];
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

      return finalResponse;
    } catch (error) {
      this.logger.error('❌ [CLIENT] Error executing agent:', error);
      throw error;
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
      this.createMediationTool,
      this.updateMediationTool,
      this.searchMediationTool,
    ];
  }
}
