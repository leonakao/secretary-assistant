import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVectorStoreSchema1762483000000
  implements MigrationInterface
{
  name = 'CreateVectorStoreSchema1762483000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS vector_store;`);
    await queryRunner.query(`
      COMMENT ON SCHEMA vector_store IS 'LangChain vector store schema for semantic memory';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SCHEMA IF EXISTS vector_store CASCADE;`);
  }
}
