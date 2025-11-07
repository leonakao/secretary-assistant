import { DataSourceOptions } from 'typeorm';

import { SnakeCaseNamingStrategy } from './naming-strategies/snake-case.naming-strategy.js';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'postgres',
  entities: ['../**/*.entity{.ts,.js}'],
  migrations: ['migrations/**/*{.ts,.js}'],
  subscribers: [],
  synchronize: false,
  logging: false,
  migrationsRun: false,
  namingStrategy: new SnakeCaseNamingStrategy(),
};
