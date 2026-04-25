import Anthropic from '@anthropic-ai/sdk';

export type VoiceIntent =
  | 'trigger_dream'
  | 'simulate_fraud'
  | 'simulate_salary'
  | 'read_score'
  | 'read_interventions'
  | 'read_forecast'
  | 'read_dream_report'
  | 'confirm'
  | 'deny'
  | 'financial';

const SYSTEM = `Classify the voice command into exactly one category. Reply with ONLY the category name.

trigger_dream   — trigger dream mode, analyze spending overnight, run dream analysis, start dream
simulate_fraud  — simulate fraud, fake fraud transaction, test fraud detection, fraud event
simulate_salary — simulate salary, salary in, add salary, pretend salary came in, fake income
read_score      — what is my score, check my score, BUNQSY score, financial health, how am I doing
read_interventions — show my alerts, what are my warnings, any interventions, check alerts
read_forecast   — show forecast, future balance, 30-day outlook, what will my balance be
read_dream_report — read dream report, latest dream, overnight analysis, dream briefing
confirm         — yes, confirm, approve, go ahead, execute, do it, sounds good, authorize, allow
deny            — no, cancel, deny, stop, abort, do not, never mind, reject, block, decline
financial       — send money, transfer, pay someone, move funds (default for monetary commands)`;

// Fast keyword shortcuts before touching the LLM
function fastMatch(t: string): VoiceIntent | null {
  if (/\b(yes|confirm|approve|go ahead|do it|sounds good|authorize|allow it)\b/.test(t)) return 'confirm';
  if (/\b(no|cancel|deny|stop|abort|block it|never mind|reject|decline)\b/.test(t)) return 'deny';
  if (/dream/.test(t) && /trigger|start|run|activate|mode/.test(t)) return 'trigger_dream';
  if (/\bfraud\b/.test(t)) return 'simulate_fraud';
  if (/salary|income/.test(t) && /sim|fake|pretend|trigger|add|inject/.test(t)) return 'simulate_salary';
  if (/dream/.test(t) && /report|briefing|result|latest|read/.test(t)) return 'read_dream_report';
  if (/\bscore\b/.test(t)) return 'read_score';
  if (/interven|alert|warn/.test(t)) return 'read_interventions';
  if (/forecast|future balance|30.day|next month/.test(t)) return 'read_forecast';
  return null;
}

export async function classifyIntent(transcript: string): Promise<VoiceIntent> {
  const t = transcript.toLowerCase().trim();

  const fast = fastMatch(t);
  if (fast) return fast;

  // LLM fallback for ambiguous phrasing
  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 15,
      system:     SYSTEM,
      messages:   [{ role: 'user', content: `Voice command: "${transcript}"` }],
    });
    const raw = (msg.content[0]?.type === 'text' ? msg.content[0].text : '').trim().toLowerCase();
    const valid: VoiceIntent[] = [
      'trigger_dream', 'simulate_fraud', 'simulate_salary',
      'read_score', 'read_interventions', 'read_forecast', 'read_dream_report',
      'confirm', 'deny', 'financial',
    ];
    return valid.includes(raw as VoiceIntent) ? (raw as VoiceIntent) : 'financial';
  } catch {
    return 'financial';
  }
}
