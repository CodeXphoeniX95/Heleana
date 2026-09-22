import { Pool } from 'pg';

/**
 * Pool de connexions PostgreSQL via le pooler Supabase (PgBouncer mode transaction).
 *
 * Port 6543 = pooler transaction mode → gère jusqu'à des centaines de connexions
 * simultanées sans saturer Supabase Free (qui limite à 15 connexions directes).
 *
 * Important : en mode transaction, les requêtes préparées (prepared statements)
 * ne sont PAS supportées → on les désactive avec statement_timeout et
 * on évite les transactions longues.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 8_000,
});

pool.on('error', (err) => {
  console.error('Erreur pool PostgreSQL:', err);
});

export default pool;
