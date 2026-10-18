import 'dotenv/config';
import pool from './api/services/db';

async function checkPending() {
  const { rows } = await pool.query(`
    SELECT 
      w.id,
      w.group_id,
      w.amount,
      w.reason,
      w.status,
      g.name AS group_name,
      (SELECT COUNT(*)::int FROM members m WHERE m.group_id = w.group_id) AS member_count
    FROM withdrawals w
    JOIN groups g ON g.id = w.group_id
    WHERE w.status = 'pending'
  `);
  console.log('Pending withdrawals count:', rows.length);
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
}

checkPending().catch(console.error);
