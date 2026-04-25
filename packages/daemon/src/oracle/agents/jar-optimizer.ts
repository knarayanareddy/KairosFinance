import type Database from 'better-sqlite3';
import type { OracleVote } from '@bunqsy/shared';
import { getProfile, getGoals } from '../../memory/profile.js';
import type { RecallSnapshot } from '../../heartbeat/recall.js';

const FALLBACK_VOTE: OracleVote = {
  agentId:         'jar-optimizer',
  riskScore:       0,
  rationale:       'No surplus to sweep.',
  shouldIntervene: false,
};

export async function run(snapshot: RecallSnapshot, db: Database.Database): Promise<OracleVote> {
  const profile = getProfile(db);

  if (!profile?.salary_amount || profile.salary_amount <= 0) {
    return { ...FALLBACK_VOTE, rationale: 'No salary configured — cannot determine surplus threshold.' };
  }

  const goals = getGoals(db).filter(g => g.jar_account_id !== null && g.enabled);
  if (goals.length === 0) {
    return { ...FALLBACK_VOTE, rationale: 'No savings goals with linked jar accounts.' };
  }

  const balanceEur    = snapshot.balanceCents / 100;
  const salaryEur     = profile.salary_amount;
  const rentReserve   = profile.rent_amount ?? 0;

  // Keep threshold: one full salary + rent reserve in the primary account
  const keepThreshold = salaryEur + rentReserve;
  const surplus       = balanceEur - keepThreshold;

  if (surplus < 100) {
    return {
      ...FALLBACK_VOTE,
      rationale: `Balance €${balanceEur.toFixed(0)} is within keep-threshold €${keepThreshold.toFixed(0)}.`,
    };
  }

  // Score proportional to surplus relative to salary — capped at 75
  const surplusRatio = surplus / salaryEur;
  const riskScore    = Math.min(75, Math.round(surplusRatio * 50));

  return {
    agentId:         'jar-optimizer',
    riskScore,
    rationale:       `€${surplus.toFixed(0)} surplus above keep-threshold. ${goals.length} jar goal${goals.length !== 1 ? 's' : ''} ready to receive funds.`,
    shouldIntervene: true,
    suggestedType:   'JAR_SWEEP',
  };
}
