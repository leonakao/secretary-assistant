import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIgnoreUntilAndPreferredUserToContact1762478500000
  implements MigrationInterface
{
  name = 'AddIgnoreUntilAndPreferredUserToContact1762478500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD "ignore_until" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD "preferred_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD CONSTRAINT "FK_contacts_preferred_user_id" FOREIGN KEY ("preferred_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP CONSTRAINT "FK_contacts_preferred_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP COLUMN "preferred_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP COLUMN "ignore_until"`,
    );
  }
}
