import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStepToCompany1762481000000 implements MigrationInterface {
  name = 'AddStepToCompany1762481000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "step" character varying(50) NOT NULL DEFAULT 'running'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "step"`);
  }
}
