import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const _require = createRequire(import.meta.url);

interface SqliteVecModule {
  load(db: { loadExtension(file: string, entrypoint?: string): void }): void;
  getLoadablePath(): string;
}

let _db: Database.Database | null = null;
let _sqliteVecLoaded = false;

export function getDb(): Database.Database {
  if (!_db) {
    const dbPath = process.env.DB_PATH ?? './bunqsy.db';
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');

    // Run base schema (all CREATE TABLE IF NOT EXISTS — safe to re-run)
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    _db.exec(schema);

    // Migrate: add bookkeeping columns to transactions for DBs predating the ledger feature
    const txCols = new Set(
      (_db.prepare('PRAGMA table_info(transactions)').all() as { name: string }[]).map(c => c.name),
    );
    if (!txCols.has('categorized_at'))   _db.exec(`ALTER TABLE transactions ADD COLUMN categorized_at TEXT`);
    if (!txCols.has('journal_entry_id')) _db.exec(`ALTER TABLE transactions ADD COLUMN journal_entry_id TEXT`);

    // Load sqlite-vec extension and create pattern_embeddings virtual table.
    // This must happen after schema.sql because vec0 requires the extension
    // to already be loaded into the connection before the CREATE VIRTUAL TABLE.
    // If the extension is unavailable, pattern matching degrades but the daemon
    // continues operating on all other subsystems.
    try {
      const sqliteVec = _require('sqlite-vec') as SqliteVecModule;
      sqliteVec.load(_db);
      _sqliteVecLoaded = true;

      _db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS pattern_embeddings USING vec0(
          pattern_id TEXT PRIMARY KEY,
          embedding float[768]
        )
      `);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[db] sqlite-vec not loaded — pattern similarity search disabled: ${message}`);
    }
  }
  return _db;
}

/** True if the sqlite-vec extension loaded successfully this session. */
export function isSqliteVecLoaded(): boolean {
  return _sqliteVecLoaded;
}

/** Closes the database connection. Call during graceful shutdown. */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
    _sqliteVecLoaded = false;
  }
}
