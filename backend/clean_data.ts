import pool from './api/services/db';

async function clearData() {
  console.log('Connexion à Supabase...');
  try {
    console.log('Nettoyage des tables de données...');
    await pool.query(`
      TRUNCATE TABLE
        audit_log,
        notifications_log,
        approvals,
        withdrawals,
        contributions,
        objectives,
        members,
        groups,
        devices,
        users
      RESTART IDENTITY CASCADE;
    `);
    console.log('✅ Toutes les données de test ont été vidées avec succès !');
  } catch (err) {
    console.error('❌ Erreur lors du nettoyage :', err);
  } finally {
    await pool.end();
  }
}

clearData();
