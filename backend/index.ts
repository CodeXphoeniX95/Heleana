import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { attachAuditLogger } from './api/middlewares/audit.middleware';

import authRoutes from './api/routes/auth';
import groupsRoutes from './api/routes/groups';
import membersRoutes from './api/routes/members';
import contributionsRoutes from './api/routes/contributions';
import withdrawalsRoutes from './api/routes/withdrawals';
import approvalsRoutes from './api/routes/approvals';
import notificationsRoutes from './api/routes/notifications';
import devicesRoutes from './api/routes/devices';
import objectivesRoutes from './api/routes/objectives';

const app = express();

// ── Middlewares globaux ───────────────────────────────────────────────────────
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(attachAuditLogger);

// ── Sanity check ─────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ status: 'ok', app: 'Heleana API', version: '1.0.0' });
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/groups', membersRoutes);
app.use('/api/groups', contributionsRoutes);
app.use('/api/groups', withdrawalsRoutes);
app.use('/api/withdrawals', approvalsRoutes);
app.use('/api/groups', objectivesRoutes);   // /api/groups/:groupId/objectives
app.use('/api/notifications', notificationsRoutes);
app.use('/api/devices', devicesRoutes);

// ── 404 catch-all ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

// ── Error handler ────────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur', message: err.message });
});

// ── Start (dev local) ─────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`✅ Heleana API running on http://localhost:${PORT}`);
});

export default app;
