import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleToUserCompany1762479000000 implements MigrationInterface {
  name = 'AddRoleToUserCompany1762479000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_companies_role_enum" AS ENUM('owner', 'admin', 'employee')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_companies" ADD "role" "public"."user_companies_role_enum" NOT NULL DEFAULT 'employee'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_companies" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE "public"."user_companies_role_enum"`);
  }
}
