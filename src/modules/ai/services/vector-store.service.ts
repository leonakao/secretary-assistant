import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Embeddings } from '@langchain/core/embeddings';
import { Document } from '@langchain/core/documents';

export interface SemanticMemoryEntry {
  content: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(VectorStoreService.name);
  private vectorStore?: PGVectorStore;
  private embeddings?: Embeddings;
  private initializationPromise?: Promise<void>;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.initializationPromise = this.initialize();
    await this.initializationPromise;
  }

  async getVectorStore(): Promise<PGVectorStore> {
    if (!this.vectorStore) {
      if (this.initializationPromise) {
        await this.initializationPromise;
      } else {
        await this.initialize();
      }
    }

    if (!this.vectorStore) {
      throw new Error('Vector store failed to initialize');
    }

    return this.vectorStore;
  }

  async similaritySearch(
    query: string,
    {
      filter,
      limit = 5,
    }: {
      filter?: PGVectorStore['FilterType'];
      limit?: number;
    } = {},
  ): Promise<SemanticMemoryEntry[]> {
    const store = await this.getVectorStore();
    const results: Document[] = await store.similaritySearch(
      query,
      limit,
      filter,
    );

    return results.map((doc) => ({
      content: doc.pageContent,
      metadata: doc.metadata ?? {},
    }));
  }

  private async initialize(): Promise<void> {
    const apiKey = this.configService.getOrThrow<string>('GOOGLE_API_KEY');

    const connectionString = this.buildConnectionString();

    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey,
      model: 'text-embedding-004',
    });

    this.vectorStore = await PGVectorStore.initialize(this.embeddings, {
      postgresConnectionOptions: {
        connectionString,
      },
      tableName: 'documents',
      schemaName: 'vector_store',
      distanceStrategy: 'cosine',
    });

    await this.vectorStore.ensureTableInDatabase();

    this.logger.log(
      '✅ Vector store initialized (schema: vector_store.table: documents)',
    );
  }

  private buildConnectionString(): string {
    const user = this.configService.get<string>('DB_USERNAME', 'postgres');
    const password = this.configService.get<string>('DB_PASSWORD', 'postgres');
    const host = this.configService.get<string>('DB_HOST', 'localhost');
    const port = this.configService.get<number>('DB_PORT', 5432);
    const database = this.configService.get<string>('DB_DATABASE', 'postgres');

    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }
}
