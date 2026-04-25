import type Database from 'better-sqlite3';
import type { OracleVote } from '@bunqsy/shared';
import { getProfile } from '../../memory/profile.js';
import type { RecallSnapshot } from '../../heartbeat/recall.js';

// ─── Joint-account secondary-user heuristic ───────────────────────────────────

/**
 * Returns a risk boost (0–15) if a joint account has had significant outgoing
 * transactions in the last 24 hours. This acts as a proxy for secondary-user
 * activity on a shared account that the primary user may not have initiated.
 */
function jointAccountRiskBoost(
  db: Database.Database,
  snapshot: RecallSnapshot,
): { boost: number; note: string } {
  const joints = snapshot.accounts.filter(
    (a) => a.status === 'ACTIVE' && a._wrapperType === 'MonetaryAccountJoint',
  );

  for (const joint of joints) {
    const row = db
      .prepare(
        `SELECT COALESCE(SUM(ABS(amount)), 0) AS total_out
         FROM transactions
         WHERE bunq_account_id = ?
           AND amount < -200
           AND created_at >= datetime('now', '-24 hours')`,
      )
      .get(joint.id) as { total_out: number };

    if (row.total_out > 200) {
      const boost = Math.min(15, Math.round(row.total_out / 100));
      const desc = joint.description ?? `account ${joint.id}`;
      return {
        boost,
        note: `large joint-account outflow on "${desc}" (€${row.total_out.toFixed(0)} in 24h, +${boost} risk)`,
      };
    }
  }

  return { boost: 0, note: '' };
}

// ─── Agent ────────────────────────────────────────────────────────────────────

export async function run(
  snapshot: RecallSnapshot,
  db: Database.Database,
): Promise<OracleVote> {
  const profile = getProfile(db);
  const rentAmount   = profile?.rent_amount   ?? null;
  const salaryAmount = profile?.salary_amount ?? null;

  // Sum balances across ALL active accounts (not just primary)
  const activeAccounts = snapshot.accounts.filter((a) => a.status === 'ACTIVE');
  const totalBalanceCents = activeAccounts.reduce((sum, a) => {
    return sum + Math.round(parseFloat(a.balance?.value ?? '0') * 100);
  }, 0);
  const balanceEur = totalBalanceCents / 100;
  const accountCount = activeAccounts.length;

  const { boost: jointBoost, note: jointNote } = jointAccountRiskBoost(db, snapshot);
  const suffix = jointNote ? `; ${jointNote}` : '';

  if (totalBalanceCents <= 0) {
    return {
      agentId:         'balance-sentinel',
      riskScore:       Math.min(100, 100 + jointBoost),
      rationale:       `Account(s) overdrawn: total balance €${balanceEur.toFixed(2)} across ${accountCount} account(s)${suffix}`,
      shouldIntervene: true,
      suggestedType:   'BALANCE_CRITICAL',
    };
  }

  if (rentAmount !== null && balanceEur < rentAmount) {
    const shortfall = (rentAmount - balanceEur).toFixed(2);
    return {
      agentId:         'balance-sentinel',
      riskScore:       Math.min(100, 85 + jointBoost),
      rationale:       `Total balance €${balanceEur.toFixed(2)} below rent €${rentAmount} (€${shortfall} short)${suffix}`,
      shouldIntervene: true,
      suggestedType:   'BALANCE_LOW',
    };
  }

  if (balanceEur < 50) {
    return {
      agentId:         'balance-sentinel',
      riskScore:       Math.min(100, 75 + jointBoost),
      rationale:       `Total balance critically low: €${balanceEur.toFixed(2)}${suffix}`,
      shouldIntervene: true,
      suggestedType:   'BALANCE_LOW',
    };
  }

  if (balanceEur < 200) {
    return {
      agentId:         'balance-sentinel',
      riskScore:       Math.min(100, 45 + jointBoost),
      rationale:       `Total balance below €200 safety buffer: €${balanceEur.toFixed(2)}${suffix}`,
      shouldIntervene: false,
    };
  }

  if (salaryAmount !== null && balanceEur < salaryAmount * 0.1) {
    return {
      agentId:         'balance-sentinel',
      riskScore:       Math.min(100, 30 + jointBoost),
      rationale:       `Total balance €${balanceEur.toFixed(2)} is below 10% of monthly salary${suffix}`,
      shouldIntervene: false,
    };
  }

  // Joint-only risk elevation (balance is healthy, but joint activity is notable)
  if (jointBoost > 0) {
    return {
      agentId:         'balance-sentinel',
      riskScore:       jointBoost,
      rationale:       `Balance €${balanceEur.toFixed(2)} is healthy; ${jointNote}`,
      shouldIntervene: jointBoost >= 10,
    };
  }

  return {
    agentId:         'balance-sentinel',
    riskScore:       5,
    rationale:       `Total balance €${balanceEur.toFixed(2)} across ${accountCount} account(s) is healthy`,
    shouldIntervene: false,
  };
}
