import { BaseStore } from '@langchain/langgraph';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PostgresStore as CheckpointPostgresStore,
  type IndexConfig,
} from '@langchain/langgraph-checkpoint-postgres/store';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

@Injectable()
export class PostgresStore
  extends CheckpointPostgresStore
  implements BaseStore
{
  constructor(private readonly configService: ConfigService) {
    const apiKey = configService.getOrThrow<string>('GOOGLE_API_KEY');

    const connectionString = PostgresStore.buildConnectionString(configService);

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey,
      model: 'text-embedding-004',
    });

    const indexConfig: IndexConfig = {
      // text-embedding-004 uses 768 dimensions
      dims: 768,
      // LangGraph expects an `embed` function or embeddings-like object
      embed: embeddings,
      // Index the full document by default
      fields: ['$', 'value'],
    };

    super({
      connectionOptions: connectionString,
      schema: 'vector_store',
      index: indexConfig,
    });
  }

  private static buildConnectionString(configService: ConfigService): string {
    const user = configService.get<string>('DB_USERNAME', 'postgres');
    const password = configService.get<string>('DB_PASSWORD', 'postgres');
    const host = configService.get<string>('DB_HOST', 'localhost');
    const port = configService.get<number>('DB_PORT', 5432);
    const database = configService.get<string>('DB_DATABASE', 'postgres');

    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }
}
