import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentReplySettingsToCompany1764560000000
  implements MigrationInterface
{
  name = 'AddAgentReplySettingsToCompany1764560000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "agent_reply_scope" character varying(20) NOT NULL DEFAULT 'all'`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "agent_reply_name_pattern" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "agent_reply_list_mode" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "agent_reply_list_entries" jsonb NOT NULL DEFAULT '[]'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "agent_reply_list_entries"`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "agent_reply_list_mode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "agent_reply_name_pattern"`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "agent_reply_scope"`,
    );
  }
}
