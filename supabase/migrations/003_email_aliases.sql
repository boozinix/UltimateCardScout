-- ============================================================
-- CardScout — Email Aliases Migration (Phase 7 / Agent B7)
-- Run AFTER 002_extra_tables.sql.
-- Adds user_email_aliases for email forwarding feature.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_email_aliases (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alias      text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Each user gets exactly one alias
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_aliases_user ON user_email_aliases(user_id);

ALTER TABLE user_email_aliases ENABLE ROW LEVEL SECURITY;

-- Users can read their own alias
CREATE POLICY "users_read_own_alias" ON user_email_aliases
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own alias
CREATE POLICY "users_insert_own_alias" ON user_email_aliases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own alias (regenerate)
CREATE POLICY "users_delete_own_alias" ON user_email_aliases
  FOR DELETE USING (auth.uid() = user_id);

-- Add user_id to data_proposals for user-scoped proposals (email forwarding)
ALTER TABLE data_proposals ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Index for user-scoped proposal queries
CREATE INDEX IF NOT EXISTS idx_proposals_user ON data_proposals(user_id) WHERE user_id IS NOT NULL;
