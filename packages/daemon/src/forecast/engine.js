import { getProfile } from '../memory/profile.js';
import { getAllEnabledPatterns } from '../memory/patterns.js';
const FORECAST_DAYS = 30;
const VARIANCE_FACTOR = 0.20; // ±20% daily variance band
const IMPULSE_MIN_CONF = 0.50; // patterns below this threshold are ignored
const CACHE_TTL_HOURS = 6;
// ─── Public API ───────────────────────────────────────────────────────────────
export function generateForecast(db) {
    const profile = getProfile(db);
    const patterns = getAllEnabledPatterns(db);
    const salaryAmount = profile?.salary_amount ?? 0;
    const salaryDay = profile?.salary_day ?? null;
    const rentAmount = profile?.rent_amount ?? 0;
    const rentDay = profile?.rent_day ?? null;
    // Starting balance: best estimate from DB without live bunq call
    const startBalance = estimateCurrentBalance(db, salaryAmount);
    // Average daily outgoing spend from last 30 days across all accounts
    // Use account id 0 as a proxy — getAverageDailySpend with no account queries all
    const avgDailySpend = estimateAvgDailySpend(db);
    const points = [];
    let balance = startBalance;
    let lowerAccum = 0;
    let upperAccum = 0;
    for (let i = 1; i <= FORECAST_DAYS; i++) {
        const date = offsetDateISO(i);
        const dayObj = new Date(date);
        const dom = dayObj.getUTCDate(); // day of month 1-31
        const dow = dayObj.getUTCDay(); // 0=Sun, 6=Sat
        const events = [];
        // ── Rule 1: Deterministic events ─────────────────────────────────────────
        if (rentDay !== null && dom === rentDay && rentAmount > 0) {
            balance -= rentAmount;
            events.push({
                type: 'RENT',
                description: `Rent payment`,
                amount: rentAmount,
                probability: 1.0,
            });
        }
        if (salaryDay !== null && dom === salaryDay && salaryAmount > 0) {
            balance += salaryAmount;
            events.push({
                type: 'SALARY',
                description: `Salary credit`,
                amount: salaryAmount,
                probability: 1.0,
            });
        }
        // ── Rule 2: Average daily spend + variance band ───────────────────────────
        balance -= avgDailySpend;
        lowerAccum += avgDailySpend * VARIANCE_FACTOR;
        upperAccum += avgDailySpend * VARIANCE_FACTOR;
        // ── Rule 3: Pattern-based impulse risk ────────────────────────────────────
        for (const pattern of patterns) {
            if (pattern.confidence < IMPULSE_MIN_CONF)
                continue;
            const trigger = classifyPatternTrigger(pattern);
            if (!trigger)
                continue;
            const fires = (trigger === 'weekend' && (dow === 0 || dow === 6)) ||
                (trigger === 'friday' && dow === 5) ||
                (trigger === 'monthly' && dom === 1) ||
                (trigger === 'weekly' && dow === 1) ||
                (trigger === 'daily' && true);
            if (fires) {
                const impulseAmount = estimateImpulseAmount(pattern, avgDailySpend);
                // Apply expected value (probability × amount) to projected balance
                balance -= pattern.confidence * impulseAmount;
                events.push({
                    type: 'IMPULSE_RISK',
                    description: pattern.name,
                    amount: impulseAmount,
                    probability: pattern.confidence,
                });
                // Widen confidence interval by impulse variance
                upperAccum += impulseAmount * (1 - pattern.confidence);
                lowerAccum += impulseAmount * pattern.confidence * 0.5;
            }
        }
        // ── Rule 4: Risk flag when balance drops below rent threshold ─────────────
        if (rentAmount > 0 && balance < rentAmount && !events.some(e => e.type === 'RENT')) {
            events.push({
                type: 'GOAL_MILESTONE',
                description: 'Balance below rent threshold — risk of shortfall',
                probability: 1.0,
            });
        }
        points.push({
            date,
            projectedBalance: parseFloat(balance.toFixed(2)),
            lowerBound: parseFloat(Math.max(0, balance - lowerAccum).toFixed(2)),
            upperBound: parseFloat((balance + upperAccum).toFixed(2)),
            events,
        });
    }
    return points;
}
export function getCachedForecast(db) {
    const row = db
        .prepare(`SELECT * FROM forecast_cache WHERE id = 1 LIMIT 1`)
        .get();
    if (!row)
        return null;
    if (new Date(row.expires_at) <= new Date())
        return null; // expired
    try {
        return JSON.parse(row.data);
    }
    catch {
        return null;
    }
}
export function storeForecastCache(db, points) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_TTL_HOURS * 3_600_000);
    db.prepare(`
    INSERT INTO forecast_cache (id, generated_at, expires_at, data)
    VALUES (1, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      generated_at = excluded.generated_at,
      expires_at   = excluded.expires_at,
      data         = excluded.data
  `).run(now.toISOString(), expiresAt.toISOString(), JSON.stringify(points));
}
// ─── Internal helpers ─────────────────────────────────────────────────────────
function estimateCurrentBalance(db, salaryAmount) {
    // Best available proxy: scale BUNQSY balance_component by salary
    const row = db
        .prepare(`SELECT balance_component FROM score_log ORDER BY logged_at DESC LIMIT 1`)
        .get();
    const component = row?.balance_component ?? 50;
    if (salaryAmount > 0) {
        // balance_component (0-100) ≈ fraction of salary currently held
        return parseFloat((salaryAmount * (component / 100)).toFixed(2));
    }
    // No salary info: treat score as €0–€2000 range
    return parseFloat((component * 20).toFixed(2));
}
function estimateAvgDailySpend(db) {
    // Sum all outgoing transactions from past 30 days, divided by 30
    const row = db
        .prepare(`
      SELECT COALESCE(SUM(ABS(amount)), 0) / 30.0 AS avg_daily
      FROM transactions
      WHERE amount < 0
        AND created_at >= datetime('now', '-30 days')
    `)
        .get();
    const avg = row.avg_daily;
    // Clamp to a reasonable range: €5–€200/day
    return Math.min(200, Math.max(5, avg));
}
function classifyPatternTrigger(pattern) {
    const text = `${pattern.name} ${pattern.description}`.toLowerCase();
    // Check trigger_conditions JSON for explicit keys
    let conditions = {};
    try {
        conditions = JSON.parse(pattern.trigger_conditions);
    }
    catch { /* ignore */ }
    if ('day_of_week' in conditions) {
        const dow = conditions['day_of_week'];
        if (dow === 0 || dow === 6 || dow === 'weekend')
            return 'weekend';
        if (dow === 5 || dow === 'friday')
            return 'friday';
        if (dow === 1 || dow === 'monday')
            return 'weekly';
    }
    if ('day_of_month' in conditions)
        return 'monthly';
    // Fall back to name/description keywords
    if (text.includes('weekend') || text.includes('saturday') || text.includes('sunday'))
        return 'weekend';
    if (text.includes('friday'))
        return 'friday';
    if (text.includes('monthly') || text.includes('subscription'))
        return 'monthly';
    if (text.includes('weekly'))
        return 'weekly';
    if (text.includes('daily') || text.includes('every day'))
        return 'daily';
    return null;
}
function estimateImpulseAmount(pattern, avgDailySpend) {
    // Try to read amount from intervention_template
    try {
        const template = JSON.parse(pattern.intervention_template);
        if (typeof template['amount'] === 'number' && template['amount'] > 0) {
            return template['amount'];
        }
    }
    catch { /* ignore */ }
    // Default: 1.5× average daily spend for high-confidence impulse events
    return parseFloat((avgDailySpend * 1.5).toFixed(2));
}
function offsetDateISO(daysFromNow) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + daysFromNow);
    return d.toISOString().slice(0, 10);
}
