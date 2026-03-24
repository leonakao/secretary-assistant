import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckpointerSchema1731282000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create checkpointer schema
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS checkpointer;`);

    // The PostgresSaver.setup() will create the necessary tables
    // But we need to ensure the schema exists first
    await queryRunner.query(`
      COMMENT ON SCHEMA checkpointer IS 'LangGraph checkpointer storage for conversation state';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the schema and all its tables
    await queryRunner.query(`DROP SCHEMA IF EXISTS checkpointer CASCADE;`);
  }
}
