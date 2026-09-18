-- ============================================================
-- Heleana – Table objectives (projets / budget du groupe)
-- À exécuter dans Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS objectives (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id     UUID          NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title        VARCHAR(200)  NOT NULL,
  description  TEXT,
  budget       NUMERIC(12,2),           -- Montant cible (optionnel)
  target_date  DATE,                    -- Date souhaitée (optionnel)
  is_achieved  BOOLEAN       NOT NULL DEFAULT FALSE,
  achieved_at  TIMESTAMPTZ,
  created_by   UUID          NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_objectives_group_id ON objectives (group_id);
CREATE INDEX IF NOT EXISTS idx_objectives_is_achieved ON objectives (group_id, is_achieved);

CREATE TRIGGER trg_objectives_updated_at
  BEFORE UPDATE ON objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
