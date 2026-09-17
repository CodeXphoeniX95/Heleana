-- ============================================================
-- Heleana – Schéma de base de données PostgreSQL (Supabase / Neon)
-- Version 1.0.0
-- ============================================================

-- Active l'extension uuid-ossp pour la génération d'UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 1. USERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE,
  phone         VARCHAR(30)  UNIQUE,
  password_hash TEXT        NOT NULL,
  name          VARCHAR(100) NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);

-- ────────────────────────────────────────────────────────────
-- 2. DEVICES (tokens FCM pour notifications push)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fcm_token   TEXT        NOT NULL,
  platform    VARCHAR(20) NOT NULL DEFAULT 'android', -- 'android' | 'ios'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT devices_fcm_token_unique UNIQUE (fcm_token)
);

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices (user_id);

-- ────────────────────────────────────────────────────────────
-- 3. GROUPS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groups (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              VARCHAR(150) NOT NULL,
  description       TEXT,
  currency          VARCHAR(10)  NOT NULL DEFAULT 'FCFA',
  contribution_rule VARCHAR(10)  NOT NULL DEFAULT 'fixed', -- 'fixed' | 'free'
  fixed_amount      NUMERIC(12,2),                          -- Montant fixe si contribution_rule = 'fixed'
  frequency         VARCHAR(20)  NOT NULL DEFAULT 'monthly', -- 'weekly' | 'monthly' | 'other'
  -- Règle de validation des retraits : 'majority' | 'unanimity' | 'percentage'
  validation_rule   VARCHAR(20)  NOT NULL DEFAULT 'majority',
  validation_pct    INTEGER      DEFAULT 51,                 -- Utilisé si validation_rule = 'percentage'
  invite_code       VARCHAR(12)  UNIQUE NOT NULL,
  created_by        UUID        NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT groups_fixed_amount_check CHECK (
    contribution_rule <> 'fixed' OR fixed_amount IS NOT NULL
  ),
  CONSTRAINT groups_validation_pct_check CHECK (
    validation_rule <> 'percentage' OR (validation_pct > 0 AND validation_pct <= 100)
  )
);

CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups (invite_code);
CREATE INDEX IF NOT EXISTS idx_groups_created_by  ON groups (created_by);

-- ────────────────────────────────────────────────────────────
-- 4. MEMBERS (table de liaison users ↔ groups)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS members (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id   UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL DEFAULT 'member', -- 'admin' | 'member'
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT members_unique UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_group_id ON members (group_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id  ON members (user_id);

-- ────────────────────────────────────────────────────────────
-- 5. CONTRIBUTIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contributions (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id       UUID        NOT NULL REFERENCES groups(id)  ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES users(id),
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(20) NOT NULL DEFAULT 'cash', -- 'cash' | 'tmoney' | 'flooz' | 'bank'
  recorded_by    UUID        NOT NULL REFERENCES users(id),  -- Admin ou le membre lui-même
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contributions_group_id ON contributions (group_id);
CREATE INDEX IF NOT EXISTS idx_contributions_user_id  ON contributions (user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_created_at ON contributions (created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 6. WITHDRAWALS (demandes de retrait)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS withdrawals (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id         UUID        NOT NULL REFERENCES groups(id)  ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES users(id),
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason           TEXT        NOT NULL,
  desired_date     DATE,
  -- 'pending' | 'approved' | 'rejected' | 'paid'
  status           VARCHAR(20) NOT NULL DEFAULT 'pending',
  resolved_at      TIMESTAMPTZ,
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_group_id ON withdrawals (group_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id  ON withdrawals (user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status   ON withdrawals (status);

-- ────────────────────────────────────────────────────────────
-- 7. APPROVALS (votes sur les retraits)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approvals (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  withdrawal_id UUID        NOT NULL REFERENCES withdrawals(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES users(id),
  decision      VARCHAR(10) NOT NULL, -- 'approve' | 'reject'
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT approvals_unique UNIQUE (withdrawal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_approvals_withdrawal_id ON approvals (withdrawal_id);
CREATE INDEX IF NOT EXISTS idx_approvals_user_id       ON approvals (user_id);

-- ────────────────────────────────────────────────────────────
-- 8. NOTIFICATIONS_LOG (historique in-app)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications_log (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(200) NOT NULL,
  message    TEXT        NOT NULL,
  type       VARCHAR(50), -- 'contribution' | 'withdrawal_request' | 'withdrawal_approved' | etc.
  entity_id  UUID,        -- ID de l'entité concernée (groupe, retrait, etc.)
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id   ON notifications_log (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read   ON notifications_log (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications_log (created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 9. AUDIT_LOG (journal d'actions sensibles)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,  -- 'create_group' | 'add_member' | etc.
  entity_type VARCHAR(50),             -- 'group' | 'withdrawal' | 'member'
  entity_id   UUID,
  details     JSONB,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id    ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity     ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 10. TRIGGER : updated_at automatique
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_withdrawals_updated_at
  BEFORE UPDATE ON withdrawals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────
-- FIN DU SCHÉMA
-- ────────────────────────────────────────────────────────────
