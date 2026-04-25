import type Database from 'better-sqlite3';
import type { UserProfileRow, GoalRow } from '@bunqsy/shared';

export interface UpsertProfileInput {
  name?: string | null;
  salaryDay?: number | null;
  salaryAmount?: number | null;
  rentAmount?: number | null;
  rentDay?: number | null;
  timezone?: string;
  voiceEnabled?: boolean;
  activeHoursStart?: number;
  activeHoursEnd?: number;
}

export interface InsertGoalInput {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string | null;
  jarAccountId?: number | null;
}

/**
 * Returns the singleton user profile row, or null if not yet set up.
 */
export function getProfile(db: Database.Database): UserProfileRow | null {
  return (
    (db.prepare(`SELECT * FROM user_profile WHERE id = 1`).get() as UserProfileRow | undefined) ??
    null
  );
}

/**
 * Creates or replaces the singleton profile row (id = 1).
 * Only the supplied fields are updated; omitted fields keep their DB defaults
 * on INSERT or existing values on UPDATE.
 */
export function upsertProfile(
  db: Database.Database,
  data: UpsertProfileInput,
): void {
  const existing = getProfile(db);

  if (!existing) {
    db.prepare(`
      INSERT INTO user_profile
        (id, name, salary_day, salary_amount, rent_amount, rent_day,
         timezone, voice_enabled, active_hours_start, active_hours_end, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      data.name ?? null,
      data.salaryDay ?? null,
      data.salaryAmount ?? null,
      data.rentAmount ?? null,
      data.rentDay ?? null,
      data.timezone ?? 'Europe/Amsterdam',
      data.voiceEnabled === false ? 0 : 1,
      data.activeHoursStart ?? 7,
      data.activeHoursEnd ?? 23,
    );
  } else {
    db.prepare(`
      UPDATE user_profile SET
        name                = COALESCE(?, name),
        salary_day          = COALESCE(?, salary_day),
        salary_amount       = COALESCE(?, salary_amount),
        rent_amount         = COALESCE(?, rent_amount),
        rent_day            = COALESCE(?, rent_day),
        timezone            = COALESCE(?, timezone),
        voice_enabled       = COALESCE(?, voice_enabled),
        active_hours_start  = COALESCE(?, active_hours_start),
        active_hours_end    = COALESCE(?, active_hours_end),
        updated_at          = datetime('now')
      WHERE id = 1
    `).run(
      data.name ?? null,
      data.salaryDay ?? null,
      data.salaryAmount ?? null,
      data.rentAmount ?? null,
      data.rentDay ?? null,
      data.timezone ?? null,
      data.voiceEnabled !== undefined ? (data.voiceEnabled ? 1 : 0) : null,
      data.activeHoursStart ?? null,
      data.activeHoursEnd ?? null,
    );
  }
}

/**
 * Returns all enabled savings goals.
 */
export function getGoals(db: Database.Database): GoalRow[] {
  return db
    .prepare(`SELECT * FROM goals WHERE enabled = 1 ORDER BY created_at ASC`)
    .all() as GoalRow[];
}

/**
 * Returns a single goal by ID, or undefined if not found.
 */
export function getGoal(
  db: Database.Database,
  id: string,
): GoalRow | undefined {
  return db
    .prepare(`SELECT * FROM goals WHERE id = ?`)
    .get(id) as GoalRow | undefined;
}

/**
 * Inserts a new savings goal.
 */
export function insertGoal(
  db: Database.Database,
  goal: InsertGoalInput,
): void {
  db.prepare(`
    INSERT INTO goals
      (id, name, target_amount, current_amount, target_date, jar_account_id, enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
  `).run(
    goal.id,
    goal.name,
    goal.targetAmount,
    goal.currentAmount ?? 0,
    goal.targetDate ?? null,
    goal.jarAccountId ?? null,
  );
}

/**
 * Updates the current_amount saved toward a goal.
 */
export function updateGoalProgress(
  db: Database.Database,
  id: string,
  currentAmount: number,
): void {
  db.prepare(
    `UPDATE goals SET current_amount = ? WHERE id = ?`,
  ).run(currentAmount, id);
}

/**
 * Links a goal to a bunq savings jar sub-account.
 */
export function linkGoalToJar(
  db: Database.Database,
  id: string,
  jarAccountId: number,
): void {
  db.prepare(
    `UPDATE goals SET jar_account_id = ? WHERE id = ?`,
  ).run(jarAccountId, id);
}
