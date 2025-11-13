import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { StateGraph } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
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
  CreateMediationTool,
  UpdateMediationTool,
  SearchMediationTool,
} from '../tools';
import { createClientAssistantNode } from '../nodes/client-assistant.node';
import { createToolNode } from '../nodes/tool.node';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VectorStoreService } from '../services/vector-store.service';
import { AgentState, ClientAgentContext } from './agent.state';
import { createDetectTransferNode } from '../nodes/detect-transfer.node';
import { createRequestHumanNode } from '../nodes/request-human.node';

@Injectable()
export class ClientAssistantAgent implements OnModuleInit {
  private readonly logger = new Logger(ClientAssistantAgent.name);
  private model: ChatGoogleGenerativeAI;
  private checkpointer: PostgresSaver;
  private vectorStore?: PGVectorStore;
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
    private readonly vectorStoreService: VectorStoreService,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

    this.logger.log('🧠 Initializing vector store for client agent...');
    this.vectorStore = await this.vectorStoreService.getVectorStore();
    this.logger.log(
      '✅ Client agent vector store ready (schema: vector_store)',
    );

    this.initializeGraph();
  }

  private initializeGraph(): void {
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

      for await (const chunk of stream) {
        if (chunk.assistant) {
          const messages = chunk.assistant.messages;
          const lastMessage = messages[messages.length - 1];

          console.log('Messages:', JSON.stringify(messages));
          console.log('Last Message:', JSON.stringify(lastMessage));

          if (lastMessage.type === 'ai') {
            console.log('IS AI', lastMessage);
            const content = lastMessage.content;

            if (typeof content === 'string') {
              finalResponse = content;
            }
          }

          continue;
        }

        if (chunk.requestHuman) {
          finalResponse =
            chunk.requestHuman.messages[chunk.requestHuman.messages.length - 1]
              .content;

          continue;
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
