import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageQueueUniqueIndex1764570000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_message_queue_pending_key
      ON "message_queue" ("conversation_key")
      WHERE "status" = 'pending'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_message_queue_pending_key"
    `);
  }
}
