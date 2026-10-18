import 'dotenv/config';
import pool from './api/services/db';

async function fix() {
  console.log('Nettoyage des retraits de test en attente...');
  // Passer les 2 retraits 'huigiu' et 'pop' en 'paid'
  const res = await pool.query(`
    UPDATE withdrawals
    SET status = 'paid', paid_at = NOW(), resolved_at = NOW()
    WHERE reason IN ('huigiu', 'pop') AND status = 'pending'
    RETURNING id, amount, reason, status;
  `);
  console.log('✅ Retraits mis à jour:', res.rows);
  await pool.end();
}

fix().catch(console.error);
