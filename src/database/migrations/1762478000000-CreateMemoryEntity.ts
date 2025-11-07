import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMemoryEntity1762478000000 implements MigrationInterface {
  name = 'CreateMemoryEntity1762478000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."memories_role_enum" AS ENUM('system', 'user', 'assistant')`,
    );
    await queryRunner.query(
      `CREATE TABLE "memories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "session_id" uuid NOT NULL, "user_id" uuid, "company_id" uuid, "role" "public"."memories_role_enum" NOT NULL, "content" text NOT NULL, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_9f0bfebcb1a49e0b6e7e4c6f7e1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_memories_session_id_created_at" ON "memories" ("session_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_memories_session_id_created_at"`,
    );
    await queryRunner.query(`DROP TABLE "memories"`);
    await queryRunner.query(`DROP TYPE "public"."memories_role_enum"`);
  }
}
