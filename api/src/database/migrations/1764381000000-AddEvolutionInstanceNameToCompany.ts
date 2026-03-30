import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEvolutionInstanceNameToCompany1764381000000
  implements MigrationInterface
{
  name = 'AddEvolutionInstanceNameToCompany1764381000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "evolution_instance_name" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "evolution_instance_name"`,
    );
  }
}
