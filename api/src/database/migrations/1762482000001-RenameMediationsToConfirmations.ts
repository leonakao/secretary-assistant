import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameMediationsToConfirmations1762482000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename table mediations -> confirmations
    await queryRunner.query(
      `ALTER TABLE "mediations" RENAME TO "confirmations"`,
    );

    // Rename indexes to keep naming consistent
    await queryRunner.query(
      `ALTER INDEX "IDX_MEDIATIONS_COMPANY_USER" RENAME TO "IDX_CONFIRMATIONS_COMPANY_USER"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_MEDIATIONS_CONTACT" RENAME TO "IDX_CONFIRMATIONS_CONTACT"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert index names first
    await queryRunner.query(
      `ALTER INDEX "IDX_CONFIRMATIONS_COMPANY_USER" RENAME TO "IDX_MEDIATIONS_COMPANY_USER"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_CONFIRMATIONS_CONTACT" RENAME TO "IDX_MEDIATIONS_CONTACT"`,
    );

    // Rename table confirmations -> mediations
    await queryRunner.query(
      `ALTER TABLE "confirmations" RENAME TO "mediations"`,
    );
  }
}
