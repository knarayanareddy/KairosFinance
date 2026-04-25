import type Database from 'better-sqlite3';
import type { TickLogRow, ScoreLogRow } from '@bunqsy/shared';
import type { BUNQSYScore } from '@bunqsy/shared';

export interface AppendTickLogInput {
  durationMs: number | null;
  reasonRan: boolean;
  verdict: string | null;
  riskScore: number | null;
  bunqsyScore: number | null;
  interventionId: string | null;
}

export function appendTickLog(db: Database.Database, entry: AppendTickLogInput): void {
  db.prepare(`
    INSERT INTO tick_log
      (duration_ms, reason_ran, verdict, risk_score, bunqsy_score, intervention_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    entry.durationMs,
    entry.reasonRan ? 1 : 0,
    entry.verdict,
    entry.riskScore,
    entry.bunqsyScore,
    entry.interventionId,
  );
}

export function appendScoreLog(db: Database.Database, score: BUNQSYScore): void {
  db.prepare(`
    INSERT INTO score_log
      (score, balance_component, velocity_component, goals_component, upcoming_component)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    score.value,
    score.components.balance,
    score.components.velocity,
    score.components.goals,
    score.components.upcoming,
  );
}

export function getLastTickLog(db: Database.Database): TickLogRow | undefined {
  return db
    .prepare(`SELECT * FROM tick_log ORDER BY tick_at DESC LIMIT 1`)
    .get() as TickLogRow | undefined;
}

export function getRecentScoreLogs(db: Database.Database, count: number = 3): ScoreLogRow[] {
  return db
    .prepare(`SELECT * FROM score_log ORDER BY logged_at DESC LIMIT ?`)
    .all(count) as ScoreLogRow[];
}
