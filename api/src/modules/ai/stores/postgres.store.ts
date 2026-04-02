import { BaseStore } from '@langchain/langgraph';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PostgresStore as CheckpointPostgresStore,
  type IndexConfig,
} from '@langchain/langgraph-checkpoint-postgres/store';
import { OpenAIEmbeddings } from '@langchain/openai';

@Injectable()
export class PostgresStore
  extends CheckpointPostgresStore
  implements BaseStore
{
  constructor(private readonly configService: ConfigService) {
    const apiKey = configService.getOrThrow<string>('OPENAI_API_KEY');

    const connectionString = PostgresStore.buildConnectionString(configService);

    const embeddings = new OpenAIEmbeddings({
      apiKey,
      model: 'text-embedding-3-small',
    });

    const indexConfig: IndexConfig = {
      // text-embedding-3-small uses 1536 dimensions
      dims: 1536,
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
