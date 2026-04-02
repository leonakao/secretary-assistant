import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResetVectorStoreForOpenAiEmbeddings1764630000000
  implements MigrationInterface
{
  name = 'ResetVectorStoreForOpenAiEmbeddings1764630000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SCHEMA IF EXISTS vector_store CASCADE;`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS vector_store;`);
    await queryRunner.query(`
      COMMENT ON SCHEMA vector_store IS 'LangChain vector store schema for semantic memory';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SCHEMA IF EXISTS vector_store CASCADE;`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS vector_store;`);
    await queryRunner.query(`
      COMMENT ON SCHEMA vector_store IS 'LangChain vector store schema for semantic memory';
    `);
  }
}
