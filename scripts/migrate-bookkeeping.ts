#!/usr/bin/env tsx
/**
 * Safe migration: adds bookkeeping columns to transactions table.
 * All ALTER TABLE statements are wrapped in try/catch so re-running
 * is idempotent (SQLite throws if the column already exists).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';

const DB_PATH = process.env['DB_PATH'] ?? path.join(__dirname, '../bunqsy.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Apply base schema first (creates all core tables if they don't exist)
const schemaPath = path.join(__dirname, '../packages/daemon/src/memory/schema.sql');
const schema = readFileSync(schemaPath, 'utf8');
try {
  db.exec(schema);
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`  ! schema.sql warning: ${msg.slice(0, 120)}`);
}

const alterColumns = [
  `ALTER TABLE transactions ADD COLUMN receipt_id TEXT`,
  `ALTER TABLE transactions ADD COLUMN categorized_at TEXT`,
  `ALTER TABLE transactions ADD COLUMN journal_entry_id TEXT`,
];

console.log('[migrate-bookkeeping] Starting...');

for (const sql of alterColumns) {
  try {
    db.prepare(sql).run();
    console.log(`  + ${sql}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('duplicate column name')) {
      console.log(`  ~ already exists (${sql.split(' ADD COLUMN ')[1]})`);
    } else {
      throw err;
    }
  }
}

// Also ensure the new tables exist (schema.sql is loaded at boot but may not
// have run yet if db was created before the bookkeeping tables were added)
const newTables: string[] = [
  `CREATE TABLE IF NOT EXISTS chart_of_accounts (
    code             TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    account_type     TEXT NOT NULL,
    deductibility_pct INTEGER NOT NULL DEFAULT 100,
    vat_rate         TEXT NOT NULL DEFAULT 'EXEMPT'
  )`,
  `CREATE TABLE IF NOT EXISTS journal_entries (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_journal_entries_tx_id ON journal_entries (tx_id)`,
  `CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries (date DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_journal_entries_review ON journal_entries (review_required, reviewed_at)`,
  `CREATE TABLE IF NOT EXISTS categorization_corrections (
    id              TEXT PRIMARY KEY,
    counterparty    TEXT NOT NULL,
    old_category    TEXT NOT NULL,
    new_category    TEXT NOT NULL,
    corrected_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_corrections_counterparty ON categorization_corrections (counterparty)`,
  `CREATE TABLE IF NOT EXISTS vat_periods (
    id               TEXT PRIMARY KEY,
    year             INTEGER NOT NULL,
    quarter          INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    period_start     TEXT NOT NULL,
    period_end       TEXT NOT NULL,
    due_date         TEXT NOT NULL,
    vat_collected    REAL NOT NULL DEFAULT 0,
    vat_paid         REAL NOT NULL DEFAULT 0,
    vat_net_due      REAL NOT NULL DEFAULT 0,
    status           TEXT NOT NULL DEFAULT 'OPEN',
    filed_at         TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (year, quarter)
  )`,
];

for (const sql of newTables) {
  try {
    db.prepare(sql).run();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`  ! ${msg.slice(0, 80)}`);
  }
}

// Seed chart_of_accounts
const seedRows = [
  ['1000','Checking Account',    'ASSET',     100, 'EXEMPT'],
  ['1010','Savings Account',     'ASSET',     100, 'EXEMPT'],
  ['1200','Accounts Receivable', 'ASSET',     100, 'EXEMPT'],
  ['1400','VAT Receivable',      'ASSET',     100, 'EXEMPT'],
  ['2000','Accounts Payable',    'LIABILITY', 100, 'EXEMPT'],
  ['2200','VAT Payable',         'LIABILITY', 100, 'EXEMPT'],
  ['3000','Equity',              'EQUITY',    100, 'EXEMPT'],
  ['3100','Retained Earnings',   'EQUITY',    100, 'EXEMPT'],
  ['4000','Revenue',             'INCOME',    100, 'EXEMPT'],
  ['4100','Other Income',        'INCOME',    100, 'EXEMPT'],
  ['5000','Cost of Sales',       'EXPENSE',   100, '21'],
  ['5100','Payroll',             'EXPENSE',   100, 'EXEMPT'],
  ['5200','Software & SaaS',     'EXPENSE',   100, '21'],
  ['5300','Hardware & Equipment','EXPENSE',   100, '21'],
  ['5400','Office Supplies',     'EXPENSE',   100, '21'],
  ['5500','Professional Fees',   'EXPENSE',   100, '21'],
  ['5600','Advertising',         'EXPENSE',   100, '21'],
  ['5700','Travel',              'EXPENSE',   100, '0'],
  ['5800','Meals & Entertainment','EXPENSE',   80, '9'],
  ['5900','Phone & Internet',    'EXPENSE',   100, '21'],
  ['6000','Education',           'EXPENSE',   100, '21'],
  ['6100','Insurance',           'EXPENSE',   100, 'EXEMPT'],
  ['6200','Bank Charges',        'EXPENSE',   100, '21'],
  ['6300','General Expenses',    'EXPENSE',   100, '21'],
  ['6400','Personal',            'EXPENSE',     0, 'EXEMPT'],
  ['6500','Tax Expense',         'EXPENSE',     0, 'EXEMPT'],
] as const;

const insertCoa = db.prepare(
  `INSERT OR IGNORE INTO chart_of_accounts (code,name,account_type,deductibility_pct,vat_rate) VALUES (?,?,?,?,?)`,
);
for (const row of seedRows) insertCoa.run(...row);

console.log('[migrate-bookkeeping] Done. Chart of accounts seeded.');
db.close();
