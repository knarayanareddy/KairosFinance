import type Database from 'better-sqlite3';
import type { OracleVote, OracleVerdict, WSMessage } from '@bunqsy/shared';
import type { RecallSnapshot } from '../heartbeat/recall.js';
import { run as balanceSentinel }     from './agents/balance-sentinel.js';
import { run as velocityAnalyzer }    from './agents/velocity-analyzer.js';
import { run as patternMatcher }      from './agents/pattern-matcher.js';
import { run as subscriptionWatcher } from './agents/subscription-watcher.js';
import { run as rentProximityGuard }  from './agents/rent-proximity-guard.js';
import { run as fraudShadow }         from './agents/fraud-shadow.js';
import { run as jarOptimizer }        from './agents/jar-optimizer.js';
import { aggregate }                  from './aggregator.js';

type AgentFn = () => Promise<OracleVote>;

/**
 * Factory — binds db + wsEmit so the returned function matches the
 * HeartbeatDeps.runOracle signature: (snapshot) => Promise<OracleVerdict>.
 *
 * Real-time vote emission:
 *   Each agent promise has .then(vote => wsEmit(...)) chained at launch.
 *   Votes stream to the client as each agent resolves — not after all finish.
 *   Promise.all() waits only to collect results for aggregation.
 */
export function createOracle(
  db: Database.Database,
  wsEmit: (msg: WSMessage) => void,
): (snapshot: RecallSnapshot) => Promise<OracleVerdict> {
  return async (snapshot: RecallSnapshot): Promise<OracleVerdict> => {
    const agentFns: AgentFn[] = [
      () => balanceSentinel(snapshot, db),
      () => velocityAnalyzer(snapshot, db),
      () => patternMatcher(snapshot, db),
      () => subscriptionWatcher(snapshot, db),
      () => rentProximityGuard(snapshot, db),
      () => fraudShadow(snapshot, db),
      () => jarOptimizer(snapshot, db),
    ];

    // Launch all agents concurrently.
    // .then() on each promise emits the vote immediately upon resolution —
    // before Promise.all resolves. Failed agents are caught here so a single
    // broken agent never aborts the oracle run.
    const promises = agentFns.map((fn) =>
      fn()
        .then((vote) => {
          wsEmit({ type: 'oracle_vote', payload: vote });
          return vote;
        })
        .catch((err: unknown) => {
          console.error('[oracle] Agent threw unexpectedly:', err instanceof Error ? err.message : String(err));
          return null;
        }),
    );

    const settled = await Promise.all(promises);
    const votes = settled.filter((v): v is OracleVote => v !== null);

    const verdict = aggregate(votes);
    wsEmit({ type: 'oracle_verdict', payload: verdict });

    return verdict;
  };
}
