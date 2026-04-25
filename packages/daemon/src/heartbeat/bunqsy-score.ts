import type Database from 'better-sqlite3';
import type { BUNQSYScore, BUNQSYScoreComponents, TaggedMonetaryAccount, GoalRow, UserProfileRow } from '@bunqsy/shared';
import { getDailySpend, getAverageDailySpend } from '../memory/transactions.js';
import { getGoals, getProfile } from '../memory/profile.js';
import { getRecentScoreLogs } from './tick-log.js';
import type { RecallSnapshot } from './recall.js';

function readWeight(envKey: string, defaultVal: number): number {
  const val = parseFloat(process.env[envKey] ?? '');
  return isNaN(val) ? defaultVal : val;
}

// ─── Balance ──────────────────────────────────────────────────────────────────

function computeBalanceComponent(
  balanceCents: number,
  salaryEur: number | null,
  db: Database.Database,
  accountId: number,
): number {
  if (salaryEur && salaryEur > 0) {
    const ratio = (balanceCents / 100) / salaryEur;
    return Math.min(100, Math.max(0, ratio * 100));
  }

  // No salary configured: estimate runway in months from last 30 days of spend
  const avgDaily     = getAverageDailySpend(db, accountId, 30);
  const monthlySpend = avgDaily * 30;

  if (monthlySpend > 0) {
    const runwayMonths = (balanceCents / 100) / monthlySpend;
    return Math.min(100, Math.max(0, (runwayMonths / 3) * 100)); // 3-month runway = 100
  }

  // No spend history yet: scale to €10,000 ceiling (old formula capped at €1,000)
  return Math.min(100, Math.max(0, (balanceCents / 100) / 100));
}

// ─── Velocity ─────────────────────────────────────────────────────────────────

function computeVelocityComponent(db: Database.Database, accountId: number): number {
  const daily    = getDailySpend(db, accountId);
  const avgDaily = getAverageDailySpend(db, accountId, 30);
  if (avgDaily === 0) return 100;
  const ratio = daily / avgDaily;
  return Math.min(100, Math.max(0, (2 - ratio) * 50));
}

// ─── Per-goal savings score ───────────────────────────────────────────────────

function scoreGoal(goal: GoalRow, accounts: TaggedMonetaryAccount[]): number {
  let effectiveAmount = goal.current_amount;
  if (goal.jar_account_id !== null) {
    const jar = accounts.find((a) => a.id === goal.jar_account_id && a.status === 'ACTIVE');
    if (jar?.balance?.value) {
      const liveBalance = parseFloat(jar.balance.value);
      effectiveAmount = Math.min(goal.current_amount, liveBalance);
    }
  }

  const absoluteProgress = effectiveAmount / Math.max(goal.target_amount, 0.01);

  if (!goal.target_date) {
    return Math.min(1, absoluteProgress);
  }

  const now        = Date.now();
  const targetMs   = new Date(goal.target_date).getTime();
  const createdMs  = new Date(goal.created_at).getTime();
  const totalMs    = Math.max(1, targetMs - createdMs);
  const elapsedMs  = Math.max(0, now - createdMs);

  const elapsedFraction = Math.min(1, elapsedMs / totalMs);
  if (elapsedFraction === 0) return Math.min(1, absoluteProgress);

  const expectedProgress  = elapsedFraction;
  const savingsRateFactor = Math.min(1, absoluteProgress / Math.max(0.001, expectedProgress));
  return Math.min(1, absoluteProgress * 0.6 + savingsRateFactor * 0.4);
}

function computeGoalsComponent(
  db: Database.Database,
  accounts: TaggedMonetaryAccount[],
): number {
  const goals = getGoals(db);
  if (goals.length === 0) return 50;

  const scores = goals.map((g) => scoreGoal(g, accounts));
  const avg    = scores.reduce((s, p) => s + p, 0) / scores.length;
  return Math.min(100, avg * 100);
}

// ─── Upcoming obligations ─────────────────────────────────────────────────────

function computeUpcomingComponent(
  db: Database.Database,
  balanceCents: number,
  profile: UserProfileRow | null,
): number {
  // ── Rent proximity ──────────────────────────────────────────────────────────
  if (profile?.rent_amount != null && profile.rent_day != null && profile.rent_amount > 0) {
    const now         = new Date();
    const today       = now.getDate();
    const rentDay     = profile.rent_day;
    const rentCents   = Math.round(profile.rent_amount * 100);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const daysUntilRent =
      today <= rentDay
        ? rentDay - today
        : daysInMonth - today + rentDay;

    if (daysUntilRent <= 7) {
      const postRentCents = balanceCents - rentCents;
      if (postRentCents < 0)               return 0;
      if (postRentCents < rentCents * 0.5) return 20;
      if (postRentCents < rentCents)       return 45;
      if (postRentCents < rentCents * 2)   return 65;
      return 85;
    }

    // Outside 7-day window: gentle urgency curve, 70–90 range
    const urgencyFactor = Math.max(0, 1 - (daysUntilRent - 7) / 24);
    return Math.round(90 - urgencyFactor * 20);
  }

  // ── Recurring subscriptions (is_recurring = 1, last 35 days) ───────────────
  const recurringRow = db
    .prepare(
      `SELECT COALESCE(SUM(ABS(amount)), 0) AS monthly_obligations
       FROM transactions
       WHERE is_recurring = 1
         AND amount < 0
         AND created_at >= datetime('now', '-35 days')`,
    )
    .get() as { monthly_obligations: number };

  if (recurringRow.monthly_obligations > 0) {
    const obligationsCents = Math.round(recurringRow.monthly_obligations * 100);
    const coverageRatio    = balanceCents / Math.max(1, obligationsCents);
    return Math.min(100, Math.max(0, Math.min(coverageRatio / 10, 1) * 100));
  }

  // No upcoming obligations data — neutral
  return 75;
}

// ─── Trend ────────────────────────────────────────────────────────────────────

function computeTrend(db: Database.Database, currentScore: number): 'up' | 'down' | 'flat' {
  const recent = getRecentScoreLogs(db, 3);
  if (recent.length === 0) return 'flat';
  const lastScore = recent[0].score;
  const diff = currentScore - lastScore;
  if (diff > 2)  return 'up';
  if (diff < -2) return 'down';
  return 'flat';
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeBunqsyScore(
  db: Database.Database,
  snapshot: RecallSnapshot,
): BUNQSYScore {
  const profile = getProfile(db);

  const wBalance  = readWeight('SCORE_WEIGHT_BALANCE',  0.35);
  const wVelocity = readWeight('SCORE_WEIGHT_VELOCITY', 0.25);
  const wGoals    = readWeight('SCORE_WEIGHT_GOALS',    0.25);
  const wUpcoming = readWeight('SCORE_WEIGHT_UPCOMING', 0.15);

  const components: BUNQSYScoreComponents = {
    balance:  computeBalanceComponent(snapshot.balanceCents, profile?.salary_amount ?? null, db, snapshot.primaryAccountId),
    velocity: computeVelocityComponent(db, snapshot.primaryAccountId),
    goals:    computeGoalsComponent(db, snapshot.accounts),
    upcoming: computeUpcomingComponent(db, snapshot.balanceCents, profile),
  };

  const raw =
    components.balance  * wBalance  +
    components.velocity * wVelocity +
    components.goals    * wGoals    +
    components.upcoming * wUpcoming;

  const value = Math.round(Math.min(100, Math.max(0, raw)));
  const trend = computeTrend(db, value);

  return {
    value,
    components,
    trend,
    computedAt: new Date().toISOString(),
  };
}
