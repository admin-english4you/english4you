import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Só a branch dev: lê .env.development.local e recusa o endpoint de produção.
dotenv.config({ path: '.env.development.local' });

const PRODUCTION_DB_HOSTS = ['ep-damp-sky-ayn2n2bc'];
const url = process.env.DATABASE_URL ?? '';
if (!url || PRODUCTION_DB_HOSTS.some((host) => url.includes(host))) {
  throw new Error('drizzle.dev.config: DATABASE_URL ausente ou apontando para PRODUÇÃO. Use .env.development.local.');
}

export default defineConfig({
  schema: './modules/**/*.schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
});
