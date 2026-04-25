import { run as balanceSentinel } from './agents/balance-sentinel.js';
import { run as velocityAnalyzer } from './agents/velocity-analyzer.js';
import { run as patternMatcher } from './agents/pattern-matcher.js';
import { run as subscriptionWatcher } from './agents/subscription-watcher.js';
import { run as rentProximityGuard } from './agents/rent-proximity-guard.js';
import { run as fraudShadow } from './agents/fraud-shadow.js';
import { run as jarOptimizer } from './agents/jar-optimizer.js';
import { aggregate } from './aggregator.js';
/**
 * Factory — binds db + wsEmit so the returned function matches the
 * HeartbeatDeps.runOracle signature: (snapshot) => Promise<OracleVerdict>.
 *
 * Real-time vote emission:
 *   Each agent promise has .then(vote => wsEmit(...)) chained at launch.
 *   Votes stream to the client as each agent resolves — not after all finish.
 *   Promise.all() waits only to collect results for aggregation.
 */
export function createOracle(db, wsEmit) {
    return async (snapshot) => {
        const agentFns = [
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
        const promises = agentFns.map((fn) => fn()
            .then((vote) => {
            wsEmit({ type: 'oracle_vote', payload: vote });
            return vote;
        })
            .catch((err) => {
            console.error('[oracle] Agent threw unexpectedly:', err instanceof Error ? err.message : String(err));
            return null;
        }));
        const settled = await Promise.all(promises);
        const votes = settled.filter((v) => v !== null);
        const verdict = aggregate(votes);
        wsEmit({ type: 'oracle_verdict', payload: verdict });
        return verdict;
    };
}
