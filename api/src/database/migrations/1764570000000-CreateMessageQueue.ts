import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMessageQueue1764570000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "message_queue_channel_enum" AS ENUM ('whatsapp', 'web_chat')
    `);

    await queryRunner.query(`
      CREATE TYPE "message_queue_status_enum" AS ENUM ('pending', 'processing', 'done', 'failed')
    `);

    // Create table
    await queryRunner.query(`
      CREATE TABLE "message_queue" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "conversation_key" varchar(512) NOT NULL,
        "channel" "message_queue_channel_enum" NOT NULL,
        "messages" jsonb NOT NULL DEFAULT '[]',
        "status" "message_queue_status_enum" NOT NULL DEFAULT 'pending',
        "enqueued_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "last_message_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "processed_at" TIMESTAMP WITH TIME ZONE
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_message_queue_conversation_key_status"
      ON "message_queue" ("conversation_key", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_message_queue_status_last_message_at"
      ON "message_queue" ("status", "last_message_at")
      WHERE "status" = 'pending'
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_message_queue_conversation_key"
      ON "message_queue" ("conversation_key")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_message_queue_status_last_message_at"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_message_queue_conversation_key_status"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_message_queue_conversation_key"
    `);

    // Drop table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "message_queue"
    `);

    // Drop enums
    await queryRunner.query(`
      DROP TYPE IF EXISTS "message_queue_status_enum"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "message_queue_channel_enum"
    `);
  }
}
