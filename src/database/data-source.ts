import { DataSource } from 'typeorm';
import { dataSourceOptions } from './database.config.js';

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
export { dataSourceOptions };
