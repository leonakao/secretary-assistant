import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class AddServiceRequests1731165000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create service_requests table
    await queryRunner.createTable(
      new Table({
        name: 'service_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'company_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'contact_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'request_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'",
            isNullable: false,
          },
          {
            name: 'scheduled_for',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'internal_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'client_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'assigned_to_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'service_requests',
      new TableIndex({
        name: 'IDX_SERVICE_REQUESTS_COMPANY_STATUS',
        columnNames: ['company_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'service_requests',
      new TableIndex({
        name: 'IDX_SERVICE_REQUESTS_COMPANY_CONTACT',
        columnNames: ['company_id', 'contact_id'],
      }),
    );

    await queryRunner.createIndex(
      'service_requests',
      new TableIndex({
        name: 'IDX_SERVICE_REQUESTS_COMPANY_TYPE',
        columnNames: ['company_id', 'request_type'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'service_requests',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'companies',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'service_requests',
      new TableForeignKey({
        columnNames: ['contact_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'contacts',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'service_requests',
      new TableForeignKey({
        columnNames: ['assigned_to_user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const table = await queryRunner.getTable('service_requests');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('service_requests', foreignKey);
      }
    }

    // Drop indexes
    await queryRunner.dropIndex(
      'service_requests',
      'IDX_SERVICE_REQUESTS_COMPANY_STATUS',
    );
    await queryRunner.dropIndex(
      'service_requests',
      'IDX_SERVICE_REQUESTS_COMPANY_CONTACT',
    );
    await queryRunner.dropIndex(
      'service_requests',
      'IDX_SERVICE_REQUESTS_COMPANY_TYPE',
    );

    // Drop table
    await queryRunner.dropTable('service_requests');
  }
}
