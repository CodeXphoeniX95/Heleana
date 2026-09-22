import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import pool from '../services/db';

const router = Router();

router.get('/overview', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const { rows: requesterRows } = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );

    const requesterEmail = requesterRows[0]?.email?.toLowerCase();
    if (requesterEmail !== 'goyitresor@gmail.com') {
      return res.status(403).json({
        error: 'Accès refusé. Seul le compte Super Admin (goyitresor@gmail.com) est autorisé.',
      });
    }
    // 1. System-wide Key Metrics
    const statsRes = await pool.query(`
      SELECT 
        (SELECT COUNT(*)::int FROM users) as total_users,
        (SELECT COUNT(*)::int FROM groups) as total_groups,
        (SELECT COALESCE(SUM(amount), 0)::float FROM contributions) as total_contributed,
        (SELECT COALESCE(SUM(amount), 0)::float FROM withdrawals WHERE status IN ('approved', 'paid')) as total_withdrawn,
        (SELECT COUNT(*)::int FROM withdrawals WHERE status = 'pending') as pending_withdrawals_count
    `);

    // 2. All System Users
    const usersRes = await pool.query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.phone, 
        u.avatar_url, 
        u.created_at,
        (SELECT COUNT(*)::int FROM members m WHERE m.user_id = u.id) as groups_count,
        (SELECT COALESCE(SUM(amount), 0)::float FROM contributions c WHERE c.user_id = u.id) as total_contributed
      FROM users u
      ORDER BY u.created_at DESC
    `);

    // 3. All System Groups
    const groupsRes = await pool.query(`
      SELECT 
        g.*, 
        u.name as creator_name,
        (SELECT COUNT(*)::int FROM members m WHERE m.group_id = g.id) as member_count,
        (SELECT COALESCE(SUM(amount), 0)::float FROM contributions c WHERE c.group_id = g.id) as total_contributions,
        (SELECT COALESCE(SUM(amount), 0)::float FROM withdrawals w WHERE w.group_id = g.id AND w.status IN ('approved', 'paid')) as total_withdrawals,
        (
          (SELECT COALESCE(SUM(amount), 0)::float FROM contributions c WHERE c.group_id = g.id) -
          (SELECT COALESCE(SUM(amount), 0)::float FROM withdrawals w WHERE w.group_id = g.id AND w.status IN ('approved', 'paid'))
        )::float as balance
      FROM groups g
      LEFT JOIN users u ON u.id = g.created_by
      ORDER BY g.created_at DESC
    `);

    // 4. All System Contributions
    const contribsRes = await pool.query(`
      SELECT c.id, c.group_id, c.user_id, c.amount::float, c.payment_method, c.note, c.created_at,
             u.name as member_name, g.name as group_name
      FROM contributions c
      JOIN users u ON u.id = c.user_id
      JOIN groups g ON g.id = c.group_id
      ORDER BY c.created_at DESC
      LIMIT 150
    `);

    // 5. All System Withdrawals
    const withdrawalsRes = await pool.query(`
      SELECT w.id, w.group_id, w.user_id, w.amount::float, w.reason, w.status, w.created_at,
             u.name as requester_name, g.name as group_name
      FROM withdrawals w
      JOIN users u ON u.id = w.user_id
      JOIN groups g ON g.id = w.group_id
      ORDER BY w.created_at DESC
      LIMIT 150
    `);

    const stats = statsRes.rows[0];
    const totalContributed = parseFloat(stats.total_contributed || '0');
    const totalWithdrawn = parseFloat(stats.total_withdrawn || '0');

    res.json({
      stats: {
        total_users: parseInt(stats.total_users || '0'),
        total_groups: parseInt(stats.total_groups || '0'),
        total_contributed: totalContributed,
        total_withdrawn: totalWithdrawn,
        global_balance: totalContributed - totalWithdrawn,
        pending_withdrawals_count: parseInt(stats.pending_withdrawals_count || '0'),
      },
      users: usersRes.rows.map((u) => ({
        ...u,
        total_contributed: parseFloat(u.total_contributed || '0'),
        groups_count: parseInt(u.groups_count || '0'),
      })),
      groups: groupsRes.rows.map((g) => ({
        ...g,
        balance: parseFloat(g.balance || '0'),
        total_contributions: parseFloat(g.total_contributions || '0'),
        total_withdrawals: parseFloat(g.total_withdrawals || '0'),
        member_count: parseInt(g.member_count || '0'),
      })),
      contributions: contribsRes.rows,
      withdrawals: withdrawalsRes.rows,
    });
  } catch (err) {
    console.error('Error in /api/admin/overview:', err);
    next(err);
  }
});

export default router;
