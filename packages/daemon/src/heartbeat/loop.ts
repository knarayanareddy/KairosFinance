import type { BUNQSYScore, OracleVerdict, InterventionPayload, ScoreDeltaExplainPayload } from '@bunqsy/shared';
import { getDb } from '../memory/db.js';
import { type BunqClient } from '../bunq/client.js';
import { recall, type RecallSnapshot } from './recall.js';
import { computeBunqsyScore } from './bunqsy-score.js';
import { appendTickLog, appendScoreLog, getRecentScoreLogs } from './tick-log.js';
import { tryExplainScoreDelta } from './score-delta.js';

export interface HeartbeatDeps {
  client: BunqClient;
  runOracle?: (snapshot: RecallSnapshot) => Promise<OracleVerdict>;
  dispatchIntervention?: (
    verdict: OracleVerdict,
    snapshot: RecallSnapshot,
  ) => Promise<InterventionPayload | null>;
  onScore?: (score: BUNQSYScore) => void;
  onScoreDelta?: (payload: ScoreDeltaExplainPayload) => void;
  onIntervention?: (payload: InterventionPayload) => void;
  onTickRecord?: (snapshot: RecallSnapshot) => void;
  onError?: (err: Error) => void;
}

export async function runTick(deps: HeartbeatDeps): Promise<void> {
  const start = Date.now();
  const db = getDb();

  console.log('[heartbeat] Tick starting...');
  // Fetch accounts once; pass to recall() to avoid a second getAccounts() call
  const accounts = await deps.client.getAccounts();
  console.log(`[heartbeat] Fetched ${accounts.length} accounts`);
  const snapshot = await recall(deps.client, db, accounts);
  console.log(`[heartbeat] Recall complete, AID=${snapshot.primaryAccountId}, new transactions: ${snapshot.newTxCount}`);
  deps.onTickRecord?.(snapshot);

  // Read previous score BEFORE appending so delta comparison is against the last persisted value
  const prevScores = getRecentScoreLogs(db, 1);
  const score = computeBunqsyScore(db, snapshot);

  appendScoreLog(db, score);
  deps.onScore?.(score);

  // Explain meaningful score changes (>= 3 pts) via Claude Haiku
  if (prevScores.length > 0) {
    const delta = score.value - prevScores[0].score;
    const deltaPayload = await tryExplainScoreDelta(delta, score.value, prevScores[0], score.components);
    if (deltaPayload) deps.onScoreDelta?.(deltaPayload);
  }

  let verdict: OracleVerdict | null = null;
  let interventionId: string | null = null;
  let reasonRan = false;

  if (deps.runOracle) {
    console.log('[heartbeat] Running Oracle reasoning...');
    reasonRan = true;
    verdict = await deps.runOracle(snapshot);
    console.log(`[heartbeat] Oracle verdict: ${verdict.shouldIntervene ? 'INTERVENE' : 'CLEAR'} (score: ${verdict.aggregateRiskScore})`);
    if (verdict.shouldIntervene && deps.dispatchIntervention) {
      const dispatched = await deps.dispatchIntervention(verdict, snapshot);
      if (dispatched) {
        interventionId = dispatched.id;
        deps.onIntervention?.(dispatched);
      }
    }
  }

  appendTickLog(db, {
    durationMs:     Date.now() - start,
    reasonRan,
    verdict:        verdict?.rationale ?? null,
    riskScore:      verdict?.aggregateRiskScore ?? null,
    bunqsyScore:    score.value,
    interventionId,
  });
  console.log(`[heartbeat] Tick complete in ${Date.now() - start}ms`);
}

export function startHeartbeatLoop(
  deps: HeartbeatDeps,
  intervalMs: number = 60_000,
): () => void {
  let running = true;
  let handle: ReturnType<typeof setTimeout> | undefined;

  async function loop(): Promise<void> {
    while (running) {
      try {
        await runTick(deps);
      } catch (err: unknown) {
        deps.onError?.(err instanceof Error ? err : new Error(String(err)));
      }
      if (!running) break;
      await new Promise<void>((resolve) => {
        handle = setTimeout(resolve, intervalMs);
      });
    }
  }

  void loop();

  return (): void => {
    running = false;
    if (handle !== undefined) clearTimeout(handle);
  };
}
