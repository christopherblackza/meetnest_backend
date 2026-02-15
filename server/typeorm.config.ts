// typeorm.config.ts
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables based on NODE_ENV
const env = process.env.NODE_ENV || 'development';
const envPath = path.resolve(__dirname, `.env.${env}`);
config({ path: envPath });

console.log(`Loading TypeORM DataSource from ${envPath}`);
console.log(`Database URL: ${process.env.DATABASE_URL ? 'Loaded' : 'Missing'}`);

const isProduction = env === 'production';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false, // never use synchronize in production
  logging: true,
  entities: [
    isProduction
      ? 'dist/**/*.entity.js' // compiled JS files for production
      : 'src/**/*.entity.ts', // TS files for development
  ],
  migrations: [
    isProduction ? 'dist/db/migrations/*.js' : 'db/migrations/*.ts',
    'db/migrations/*.ts',
  ],
  ssl: {
    rejectUnauthorized: false,
  },
});
