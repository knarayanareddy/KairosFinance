import type Database from 'better-sqlite3';
import type { InterventionRow } from '@bunqsy/shared';

export type InterventionStatus = 'SHOWN' | 'CONFIRMED' | 'DISMISSED' | 'EXECUTED';

export interface InsertInterventionInput {
  id: string;
  type: string;
  riskScore: number;
  verdict: string;
  modality: string;
  narration: string;
  oracleVotes: unknown[];
  executionPlanId?: string | null;
}

/**
 * Appends a new intervention record. This is the only write path —
 * the table is treated as append-only history.
 */
export function insertIntervention(
  db: Database.Database,
  intervention: InsertInterventionInput,
): void {
  db.prepare(`
    INSERT INTO interventions
      (id, type, risk_score, verdict, modality, narration,
       oracle_votes, execution_plan_id, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SHOWN', datetime('now'))
  `).run(
    intervention.id,
    intervention.type,
    intervention.riskScore,
    intervention.verdict,
    intervention.modality,
    intervention.narration,
    JSON.stringify(intervention.oracleVotes),
    intervention.executionPlanId ?? null,
  );
}

/**
 * Updates the lifecycle status of an intervention and sets resolved_at.
 * Called when the user confirms, dismisses, or executes a plan tied to
 * this intervention. Does NOT create a new row — it closes the lifecycle
 * of an existing SHOWN intervention.
 */
export function resolveIntervention(
  db: Database.Database,
  id: string,
  status: Exclude<InterventionStatus, 'SHOWN'>,
): void {
  db.prepare(`
    UPDATE interventions
    SET status = ?, resolved_at = datetime('now')
    WHERE id = ?
  `).run(status, id);
}

/**
 * Returns the most recent unresolved (SHOWN) intervention, if any.
 * Used by the heartbeat loop to avoid stacking interventions.
 */
export function getActiveIntervention(
  db: Database.Database,
): InterventionRow | undefined {
  return db
    .prepare(
      `SELECT * FROM interventions
       WHERE status = 'SHOWN'
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .get() as InterventionRow | undefined;
}

/**
 * Returns recent intervention history, newest first.
 */
export function getInterventionHistory(
  db: Database.Database,
  limit: number = 20,
): InterventionRow[] {
  return db
    .prepare(
      `SELECT * FROM interventions
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(limit) as InterventionRow[];
}

/**
 * Returns a single intervention by ID.
 */
export function getIntervention(
  db: Database.Database,
  id: string,
): InterventionRow | undefined {
  return db
    .prepare(`SELECT * FROM interventions WHERE id = ?`)
    .get(id) as InterventionRow | undefined;
}
