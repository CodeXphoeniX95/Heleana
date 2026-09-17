import { Pool } from 'pg';

// Pool de connexions PostgreSQL (Supabase ou Neon)
// La variable DATABASE_URL est injectée par Vercel ou .env local
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('Erreur pool PostgreSQL:', err);
});

export default pool;
