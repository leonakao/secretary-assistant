import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsClientsSupportEnabledToCompany1762480000000
  implements MigrationInterface
{
  name = 'AddIsClientsSupportEnabledToCompany1762480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "is_clients_support_enabled" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "is_clients_support_enabled"`,
    );
  }
}
