import { describe, it, expect, beforeEach } from 'vitest';
import { SnakeCaseNamingStrategy } from './snake-case.naming-strategy.js';

describe('SnakeNamingStrategy', () => {
  let namingStrategy: SnakeCaseNamingStrategy;

  beforeEach(() => {
    namingStrategy = new SnakeCaseNamingStrategy();
  });

  it('should return snake case table name', () => {
    const tableName = namingStrategy.tableName('User', '');
    expect(tableName).toBe('user');
  });

  it('should return snake case table name with custom name', () => {
    const tableName = namingStrategy.tableName('User', 'Custom');
    expect(tableName).toBe('Custom');
  });

  it('should return snake case column name', () => {
    const columnName = namingStrategy.columnName('firstName', '', []);
    expect(columnName).toBe('first_name');
  });

  it('should return snake case column name with custom name', () => {
    const columnName = namingStrategy.columnName('firstName', 'Custom', []);
    expect(columnName).toBe('Custom');
  });

  it('should return snake case relation name', () => {
    const relationName = namingStrategy.relationName('posts');
    expect(relationName).toBe('posts');
  });

  it('should return snake case join column name', () => {
    const joinColumnName = namingStrategy.joinColumnName('user', 'id');
    expect(joinColumnName).toBe('user_id');
  });

  it('should return snake case join table name', () => {
    const joinTableName = namingStrategy.joinTableName(
      'user',
      'role',
      'id',
      'roleId',
    );
    expect(joinTableName).toBe('user_id_role');
  });

  it('should return snake case join table column name', () => {
    const joinTableColumnName = namingStrategy.joinTableColumnName(
      'user',
      'role',
      'name',
    );
    expect(joinTableColumnName).toBe('user_name');
  });

  it('should return snake case join table column name', () => {
    const joinTableColumnName = namingStrategy.joinTableColumnName(
      'user',
      'role',
    );
    expect(joinTableColumnName).toBe('user_role');
  });

  it('should return snake case class table inheritance parent column name', () => {
    const parentColumnName =
      namingStrategy.classTableInheritanceParentColumnName('person', 'id');
    expect(parentColumnName).toBe('person_id');
  });

  it('should return eager join relation alias', () => {
    const alias = namingStrategy.eagerJoinRelationAlias(
      'user',
      'profile.picture',
    );
    expect(alias).toBe('user__profile_picture');
  });
});
