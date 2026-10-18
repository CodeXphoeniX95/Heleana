import 'dotenv/config';
import pool from './api/services/db';

async function fix() {
  console.log('Mise à jour des retraits personnels en attente...');
  const res = await pool.query(`
    UPDATE withdrawals
    SET status = 'paid', paid_at = COALESCE(paid_at, NOW()), resolved_at = COALESCE(resolved_at, NOW())
    WHERE status = 'pending'
      AND (
        group_id IN (SELECT group_id FROM members GROUP BY group_id HAVING COUNT(*) <= 1)
        OR group_id IN (SELECT id FROM groups WHERE LOWER(name) LIKE '%caisse personnelle%' OR LOWER(name) LIKE '%épargne personnelle%')
      )
    RETURNING id, group_id, amount, reason, status;
  `);
  console.log('✅ Retraits personnels mis en statut "paid":', res.rows);
  await pool.end();
}

fix().catch((err) => {
  console.error('Erreur:', err);
  process.exit(1);
});
