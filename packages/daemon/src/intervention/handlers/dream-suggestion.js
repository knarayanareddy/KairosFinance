export async function run(_verdict, _snapshot, db) {
    // Pull the most recent completed Dream session for context
    const session = db
        .prepare(`SELECT * FROM dream_sessions
       WHERE status = 'COMPLETED'
       ORDER BY completed_at DESC LIMIT 1`)
        .get();
    // Dream suggestions are informational — they surface insights from the
    // overnight analysis. No write plan is created; the narration engine
    // will use the oracle verdict + session data for the card text.
    void session; // surfaced to the explainer via DB context
    return {
        type: 'BUNQSY_INSIGHT',
        modality: 'CARD',
        planId: null,
    };
}
