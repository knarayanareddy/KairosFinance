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
  synced_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  categorized_at    TEXT,
  journal_entry_id  TEXT
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

-- ─── Receipt history (append-only) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS receipts (
  id              TEXT PRIMARY KEY,   -- uuid
  merchant        TEXT NOT NULL,
  total           REAL NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'EUR',
  date            TEXT NOT NULL,      -- YYYY-MM-DD from receipt
  category        TEXT NOT NULL,
  line_items      TEXT NOT NULL,      -- JSON array of LineItem
  confidence      REAL NOT NULL,
  matched_tx_id   TEXT,               -- NULL if no transaction match
  insight         TEXT,
  logged_expense  INTEGER NOT NULL DEFAULT 0,  -- 1 if manually logged
  scanned_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_receipts_scanned_at
  ON receipts (scanned_at DESC);

-- ─── Forecast cache (single mutable row) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS forecast_cache (
  id           INTEGER PRIMARY KEY DEFAULT 1,
  generated_at TEXT    NOT NULL,
  expires_at   TEXT    NOT NULL,
  data         TEXT    NOT NULL   -- JSON: ForecastPoint[]
);

-- ─── Bookkeeping: chart of accounts ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  code             TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  account_type     TEXT NOT NULL,  -- ASSET | LIABILITY | EQUITY | INCOME | EXPENSE
  deductibility_pct INTEGER NOT NULL DEFAULT 100,
  vat_rate         TEXT NOT NULL DEFAULT 'EXEMPT'
);

INSERT OR IGNORE INTO chart_of_accounts VALUES
  ('1000','Checking Account',    'ASSET',     100, 'EXEMPT'),
  ('1010','Savings Account',     'ASSET',     100, 'EXEMPT'),
  ('1200','Accounts Receivable', 'ASSET',     100, 'EXEMPT'),
  ('1400','VAT Receivable',      'ASSET',     100, 'EXEMPT'),
  ('2000','Accounts Payable',    'LIABILITY', 100, 'EXEMPT'),
  ('2200','VAT Payable',         'LIABILITY', 100, 'EXEMPT'),
  ('3000','Equity',              'EQUITY',    100, 'EXEMPT'),
  ('3100','Retained Earnings',   'EQUITY',    100, 'EXEMPT'),
  ('4000','Revenue',             'INCOME',    100, 'EXEMPT'),
  ('4100','Other Income',        'INCOME',    100, 'EXEMPT'),
  ('5000','Cost of Sales',       'EXPENSE',   100, '21'),
  ('5100','Payroll',             'EXPENSE',   100, 'EXEMPT'),
  ('5200','Software & SaaS',     'EXPENSE',   100, '21'),
  ('5300','Hardware & Equipment','EXPENSE',   100, '21'),
  ('5400','Office Supplies',     'EXPENSE',   100, '21'),
  ('5500','Professional Fees',   'EXPENSE',   100, '21'),
  ('5600','Advertising',         'EXPENSE',   100, '21'),
  ('5700','Travel',              'EXPENSE',   100, '0'),
  ('5800','Meals & Entertainment','EXPENSE',   80, '9'),
  ('5900','Phone & Internet',    'EXPENSE',   100, '21'),
  ('6000','Education',           'EXPENSE',   100, '21'),
  ('6100','Insurance',           'EXPENSE',   100, 'EXEMPT'),
  ('6200','Bank Charges',        'EXPENSE',   100, '21'),
  ('6300','General Expenses',    'EXPENSE',   100, '21'),
  ('6400','Personal',            'EXPENSE',     0, 'EXEMPT'),
  ('6500','Tax Expense',         'EXPENSE',     0, 'EXEMPT');

-- ─── Bookkeeping: journal entries ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS journal_entries (
  id                  TEXT PRIMARY KEY,
  tx_id               TEXT NOT NULL,
  date                TEXT NOT NULL,
  description         TEXT,
  debit_account       TEXT NOT NULL,
  credit_account      TEXT NOT NULL,
  amount_cents        INTEGER NOT NULL,
  vat_amount_cents    INTEGER NOT NULL DEFAULT 0,
  category            TEXT NOT NULL DEFAULT 'UNCATEGORIZED',
  subcategory         TEXT,
  is_business_expense INTEGER NOT NULL DEFAULT 0,
  deductibility_pct   INTEGER NOT NULL DEFAULT 100,
  review_required     INTEGER NOT NULL DEFAULT 0,
  review_reason       TEXT,
  reviewed_at         TEXT,
  overridden_by       TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tx_id) REFERENCES transactions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_tx_id
  ON journal_entries (tx_id);

CREATE INDEX IF NOT EXISTS idx_journal_entries_date
  ON journal_entries (date DESC);

CREATE INDEX IF NOT EXISTS idx_journal_entries_review
  ON journal_entries (review_required, reviewed_at);

-- ─── Bookkeeping: categorization corrections (feedback loop) ─────────────────

CREATE TABLE IF NOT EXISTS categorization_corrections (
  id              TEXT PRIMARY KEY,
  counterparty    TEXT NOT NULL,
  old_category    TEXT NOT NULL,
  new_category    TEXT NOT NULL,
  corrected_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_corrections_counterparty
  ON categorization_corrections (counterparty);

-- ─── Bookkeeping: VAT periods ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vat_periods (
  id               TEXT PRIMARY KEY,
  year             INTEGER NOT NULL,
  quarter          INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  period_start     TEXT NOT NULL,
  period_end       TEXT NOT NULL,
  due_date         TEXT NOT NULL,
  vat_collected    REAL NOT NULL DEFAULT 0,
  vat_paid         REAL NOT NULL DEFAULT 0,
  vat_net_due      REAL NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'OPEN',  -- OPEN | FILED | OVERDUE
  filed_at         TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (year, quarter)
);
