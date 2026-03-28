import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBusinessTypeToCompany1764380000000
  implements MigrationInterface
{
  name = 'AddBusinessTypeToCompany1764380000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "business_type" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "business_type"`,
    );
  }
}
