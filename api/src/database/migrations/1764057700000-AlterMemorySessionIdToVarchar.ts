import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterMemorySessionIdToVarchar1764057700000
  implements MigrationInterface
{
  name = 'AlterMemorySessionIdToVarchar1764057700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "memories" ALTER COLUMN "session_id" TYPE varchar USING "session_id"::text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "memories" ALTER COLUMN "session_id" TYPE uuid USING "session_id"::uuid`,
    );
  }
}
