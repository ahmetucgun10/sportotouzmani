import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

// Database is optional. On serverless hosts (Vercel) without a DATABASE_URL,
// the app runs in a "no-database" mode: analyses are computed and streamed,
// but not persisted. Set DATABASE_URL to enable history/persistence.
export const hasDatabase = !!databaseUrl;

let poolInstance: Pool | null = null;

if (databaseUrl) {
  poolInstance =
    globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
      // Cloud Postgres (Neon/Supabase) often requires SSL.
      ssl: /sslmode=require|neon\.tech|supabase/.test(databaseUrl)
        ? { rejectUnauthorized: false }
        : undefined,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = poolInstance;
  }
}

export const pool = poolInstance;

// `db` is only usable when a database is configured. Guard usages with
// `hasDatabase` before calling into it.
export const db = poolInstance ? drizzle(poolInstance) : (null as unknown as ReturnType<typeof drizzle>);

// Tablolar ilk istekte otomatik oluşturulur (yalnızca ekleme, mevcut veriye dokunmaz);
// böylece Vercel'de ayrı bir "drizzle-kit push" adımı gerekmez.
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS match_analyses (
  id serial PRIMARY KEY,
  home_team varchar(255) NOT NULL,
  away_team varchar(255) NOT NULL,
  match_date varchar(100),
  league varchar(255),
  status varchar(50) NOT NULL DEFAULT 'pending',
  agent_logs jsonb DEFAULT '[]'::jsonb,
  final_prediction text,
  home_team_data jsonb,
  away_team_data jsonb,
  head_to_head jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS agent_logs (
  id serial PRIMARY KEY,
  analysis_id integer REFERENCES match_analyses(id) ON DELETE CASCADE,
  agent_name varchar(100) NOT NULL,
  agent_emoji varchar(10),
  step varchar(255),
  content text,
  sources jsonb DEFAULT '[]'::jsonb,
  status varchar(50) DEFAULT 'running',
  created_at timestamp NOT NULL DEFAULT now()
);
`;

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!poolInstance) return Promise.resolve();
  if (!schemaReady) {
    schemaReady = poolInstance
      .query(SCHEMA_SQL)
      .then(() => undefined)
      .catch((error) => {
        schemaReady = null; // bir sonraki istekte yeniden dene
        throw error;
      });
  }
  return schemaReady;
}
