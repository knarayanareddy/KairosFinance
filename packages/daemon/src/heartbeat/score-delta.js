import Anthropic from '@anthropic-ai/sdk';
const MIN_DELTA = 3; // Minimum point change to generate an explanation
export async function tryExplainScoreDelta(delta, toScore, prevRow, components) {
    if (Math.abs(delta) < MIN_DELTA)
        return null;
    const reason = await buildReason(delta, prevRow, components);
    return {
        delta,
        fromScore: prevRow.score,
        toScore,
        reason,
        computedAt: new Date().toISOString(),
    };
}
async function buildReason(delta, prev, curr) {
    const direction = delta > 0 ? 'improved' : 'declined';
    // Find the component that moved the most
    const diffs = [
        { name: 'balance health', diff: curr.balance - (prev.balance_component ?? curr.balance) },
        { name: 'spending velocity', diff: curr.velocity - (prev.velocity_component ?? curr.velocity) },
        { name: 'goals progress', diff: curr.goals - (prev.goals_component ?? curr.goals) },
        { name: 'upcoming obligations', diff: curr.upcoming - (prev.upcoming_component ?? curr.upcoming) },
    ].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    const biggest = diffs[0];
    // For small deltas (< 8 pts) skip the LLM — straight template is faster and correct
    if (Math.abs(delta) < 8) {
        const dir = biggest.diff >= 0 ? 'improved' : 'dropped';
        const pts = Math.abs(Math.round(biggest.diff));
        return `Score ${direction} by ${Math.abs(delta)} pts. ` +
            `${capitalise(biggest.name)} ${dir}${pts > 0 ? ` by ${pts} pts` : ''}.`;
    }
    try {
        const client = new Anthropic();
        const prompt = `BUNQSY financial health score ${direction} by ${Math.abs(delta)} points ` +
            `(${prev.score} → ${prev.score + delta}). ` +
            `Component changes — balance: ${(curr.balance - (prev.balance_component ?? curr.balance)).toFixed(0)}, ` +
            `velocity: ${(curr.velocity - (prev.velocity_component ?? curr.velocity)).toFixed(0)}, ` +
            `goals: ${(curr.goals - (prev.goals_component ?? curr.goals)).toFixed(0)}, ` +
            `upcoming: ${(curr.upcoming - (prev.upcoming_component ?? curr.upcoming)).toFixed(0)}. ` +
            `Write ONE sentence (max 18 words) naming the main cause. No filler. Be specific.`;
        const msg = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 60,
            messages: [{ role: 'user', content: prompt }],
        });
        const block = msg.content[0];
        if (block?.type === 'text' && block.text.trim())
            return block.text.trim();
    }
    catch { /* fall through to template */ }
    return `Score ${direction} by ${Math.abs(delta)} pts — mainly ${biggest.name}.`;
}
function capitalise(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
