export function appendTickLog(db, entry) {
    db.prepare(`
    INSERT INTO tick_log
      (duration_ms, reason_ran, verdict, risk_score, bunqsy_score, intervention_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(entry.durationMs, entry.reasonRan ? 1 : 0, entry.verdict, entry.riskScore, entry.bunqsyScore, entry.interventionId);
}
export function appendScoreLog(db, score) {
    db.prepare(`
    INSERT INTO score_log
      (score, balance_component, velocity_component, goals_component, upcoming_component)
    VALUES (?, ?, ?, ?, ?)
  `).run(score.value, score.components.balance, score.components.velocity, score.components.goals, score.components.upcoming);
}
export function getLastTickLog(db) {
    return db
        .prepare(`SELECT * FROM tick_log ORDER BY tick_at DESC LIMIT 1`)
        .get();
}
export function getRecentScoreLogs(db, count = 3) {
    return db
        .prepare(`SELECT * FROM score_log ORDER BY logged_at DESC LIMIT ?`)
        .all(count);
}
