import { fork } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import type { WSMessage } from '@bunqsy/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── IPC types (mirror of worker.ts) ─────────────────────────────────────────

interface WorkerCompleteMessage {
  type:             'COMPLETE';
  briefingText:     string;
  dnaCard:          string;
  suggestions:      string[];
  patternsUpdated:  number;
  patternsCreated:  number;
  durationMs:       number;
}

interface WorkerErrorMessage {
  type:  'ERROR';
  error: string;
}

type WorkerMessage = WorkerCompleteMessage | WorkerErrorMessage;

const WORKER_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export async function triggerDream(
  db: Database.Database,
  wsEmit: (msg: WSMessage) => void,
  triggerType: 'scheduled' | 'manual' = 'scheduled',
): Promise<string> {
  const sessionId = uuid();

  // Append-only insert — never update or delete (constitutional rule)
  db.prepare(
    `INSERT INTO dream_sessions (id, trigger_type, status, triggered_at)
     VALUES (?, ?, 'RUNNING', datetime('now'))`,
  ).run(sessionId, triggerType);

  console.log(`[dream] Starting session ${sessionId} (${triggerType})`);

  // Fork the worker — it opens its own DB connection and never touches execute.ts
  const workerPath = join(__dirname, 'worker.js');
  const worker = fork(workerPath, [], {
    execArgv: ['--import', 'tsx'],
    env:      { ...process.env, DREAM_SESSION_ID: sessionId },
    silent:   false,
  });

  // Constitutional rule: kill worker after 10 minutes
  const killTimeout = setTimeout(() => {
    console.warn(`[dream] Worker ${sessionId} exceeded 10-minute timeout — killing`);
    worker.kill('SIGKILL');
    db.prepare(
      `UPDATE dream_sessions SET status = 'KILLED', completed_at = datetime('now') WHERE id = ?`,
    ).run(sessionId);
  }, WORKER_TIMEOUT_MS);

  worker.on('message', (raw: unknown) => {
    const msg = raw as WorkerMessage;

    if (msg.type === 'COMPLETE') {
      clearTimeout(killTimeout);

      db.prepare(`
        UPDATE dream_sessions SET
          completed_at     = datetime('now'),
          duration_ms      = ?,
          patterns_updated = ?,
          patterns_created = ?,
          briefing_text    = ?,
          dna_card         = ?,
          suggestions      = ?,
          status           = 'COMPLETED'
        WHERE id = ?
      `).run(
        msg.durationMs,
        msg.patternsUpdated,
        msg.patternsCreated,
        msg.briefingText,
        msg.dnaCard,
        JSON.stringify(msg.suggestions),
        sessionId,
      );

      wsEmit({
        type:    'dream_complete',
        payload: {
          sessionId,
          briefingText: msg.briefingText,
          dnaCard:      msg.dnaCard,
          suggestions:  msg.suggestions,
        },
      });

      console.log(`[dream] Session ${sessionId} completed in ${msg.durationMs}ms`);
    }

    if (msg.type === 'ERROR') {
      clearTimeout(killTimeout);
      console.error(`[dream] Worker error for session ${sessionId}:`, msg.error);
      db.prepare(
        `UPDATE dream_sessions SET status = 'FAILED', completed_at = datetime('now') WHERE id = ?`,
      ).run(sessionId);
    }
  });

  worker.on('error', (err) => {
    clearTimeout(killTimeout);
    console.error(`[dream] Worker process error for ${sessionId}:`, err.message);
    db.prepare(
      `UPDATE dream_sessions SET status = 'FAILED', completed_at = datetime('now') WHERE id = ?`,
    ).run(sessionId);
  });

  worker.on('exit', (code) => {
    clearTimeout(killTimeout);
    if (code !== 0 && code !== null) {
      console.warn(`[dream] Worker for ${sessionId} exited with code ${code}`);
    }
  });

  return sessionId;
}
