-- BUNQSY Finance — SQLite schema
-- All statements use IF NOT EXISTS for idempotent startup execution.
-- pattern_embeddings (sqlite-vec virtual table) is created in db.ts
-- after the extension is loaded — it cannot be here.

-- ─── Auth ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  installation_token  TEXT    NOT NULL,
  session_token       TEXT    NOT NULL,
  user_id             INTEGER NOT NULL,
  public_key_pem      TEXT    NOT NULL,
  private_key_pem     TEXT    NOT NULL,
  server_public_key   TEXT    NOT NULL,
  expires_at          TEXT    NOT NULL,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── Transaction cache ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id                TEXT PRIMARY KEY,   -- bunq payment ID as string
  bunq_account_id   INTEGER NOT NULL,
  amount            REAL    NOT NULL,
  currency          TEXT    NOT NULL DEFAULT 'EUR',
  counterparty_name TEXT,
  counterparty_iban TEXT,
  description       TEXT,
  category          TEXT,
  is_recurring      INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT    NOT NULL,
  synced_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_account_date
  ON transactions (bunq_account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at
  ON transactions (created_at DESC);

-- ─── Patterns ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS patterns (
  id                    TEXT PRIMARY KEY,  -- uuid
  name                  TEXT NOT NULL,
  description           TEXT NOT NULL,
  trigger_conditions    TEXT NOT NULL,     -- JSON
  intervention_template TEXT NOT NULL,     -- JSON
  confidence            REAL NOT NULL DEFAULT 0.5,
  hit_count             INTEGER NOT NULL DEFAULT 0,
  confirmed_count       INTEGER NOT NULL DEFAULT 0,
  dismissed_count       INTEGER NOT NULL DEFAULT 0,
  enabled               INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_patterns_enabled
  ON patterns (enabled, confidence DESC);

-- ─── User profile + goals ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profile (
  id                   INTEGER PRIMARY KEY DEFAULT 1,  -- singleton row
  name                 TEXT,
  salary_day           INTEGER,
  salary_amount        REAL,
  rent_amount          REAL,
  rent_day             INTEGER,
  timezone             TEXT    NOT NULL DEFAULT 'Europe/Amsterdam',
  voice_enabled        INTEGER NOT NULL DEFAULT 1,
  active_hours_start   INTEGER NOT NULL DEFAULT 7,
  active_hours_end     INTEGER NOT NULL DEFAULT 23,
  updated_at           TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS goals (
  id              TEXT PRIMARY KEY,  -- uuid
  name            TEXT    NOT NULL,
  target_amount   REAL    NOT NULL,
  current_amount  REAL    NOT NULL DEFAULT 0,
  target_date     TEXT,
  jar_account_id  INTEGER,           -- bunq sub-account ID if linked to a Jar
  enabled         INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── Interventions (append-only history) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS interventions (
  id                TEXT PRIMARY KEY,  -- uuid
  type              TEXT NOT NULL,
  risk_score        REAL NOT NULL,
  verdict           TEXT NOT NULL,
  modality          TEXT NOT NULL,
  narration         TEXT NOT NULL,
  oracle_votes      TEXT NOT NULL,     -- JSON array of OracleVote
  execution_plan_id TEXT,
  status            TEXT NOT NULL DEFAULT 'SHOWN',  -- SHOWN | CONFIRMED | DISMISSED | EXECUTED
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at       TEXT
);

CREATE INDEX IF NOT EXISTS idx_interventions_status
  ON interventions (status, created_at DESC);

-- ─── Execution plans (append-only, required by Phase 1 execute.ts) ───────────

CREATE TABLE IF NOT EXISTS execution_plans (
  id            TEXT PRIMARY KEY,  -- uuid
  narrated_text TEXT NOT NULL,
  steps         TEXT NOT NULL,     -- JSON array of ExecutionStep
  status        TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING | CONFIRMED | EXECUTED | CANCELLED
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at  TEXT,
  executed_at   TEXT
);

-- ─── Execution step results (append-only, required by Phase 1 execute.ts) ────

CREATE TABLE IF NOT EXISTS execution_step_results (
  id            TEXT PRIMARY KEY,  -- uuid
  plan_id       TEXT NOT NULL,
  step_id       TEXT NOT NULL,
  success       INTEGER NOT NULL,
  bunq_response TEXT,              -- JSON
  error_message TEXT,
  executed_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_step_results_plan
  ON execution_step_results (plan_id);

-- ─── Heartbeat tick log (append-only) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tick_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tick_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  duration_ms     INTEGER,
  reason_ran      INTEGER NOT NULL DEFAULT 0,  -- 1 if heavy reasoning ran
  verdict         TEXT,
  risk_score      REAL,
  bunqsy_score    REAL,
  intervention_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_tick_log_tick_at
  ON tick_log (tick_at DESC);

-- ─── Dream sessions (append-only) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dream_sessions (
  id                TEXT    PRIMARY KEY,  -- uuid
  triggered_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  trigger_type      TEXT    NOT NULL DEFAULT 'scheduled',  -- 'scheduled' | 'manual'
  completed_at      TEXT,
  duration_ms       INTEGER,
  patterns_updated  INTEGER,
  patterns_created  INTEGER,
  briefing_text     TEXT,
  dna_card          TEXT,
  suggestions       TEXT,    -- JSON array of 3 suggestion strings
  status            TEXT    NOT NULL DEFAULT 'RUNNING'  -- RUNNING | COMPLETED | FAILED | KILLED
);

-- ─── BUNQSY Score log (append-only) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS score_log (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  score               REAL    NOT NULL,
  balance_component   REAL,
  velocity_component  REAL,
  goals_component     REAL,
  upcoming_component  REAL,
  logged_at           TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_score_log_logged_at
  ON score_log (logged_at DESC);

-- ─── Forecast cache (single mutable row) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS forecast_cache (
  id           INTEGER PRIMARY KEY DEFAULT 1,
  generated_at TEXT    NOT NULL,
  expires_at   TEXT    NOT NULL,
  data         TEXT    NOT NULL   -- JSON: ForecastPoint[]
);
