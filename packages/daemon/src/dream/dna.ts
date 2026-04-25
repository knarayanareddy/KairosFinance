import Anthropic from '@anthropic-ai/sdk';
import type { PatternRow, UserProfileRow } from '@bunqsy/shared';

const DNA_SYSTEM = `You generate a user's Financial DNA card.
This is 4–6 words that capture their financial personality based on their patterns.
Return ONLY the 4–6 word phrase. No punctuation except commas. No quotes.
Make it feel insightful and human, not clinical.
Examples: "Disciplined saver, impulsive weekends, risk-aware"
          "Subscription-heavy, goal-oriented, cash-conscious"
          "Spontaneous spender, strong salary discipline"`;

export async function generateDNACard(
  patterns: PatternRow[],
  profile: UserProfileRow | null,
  weekInsights: string[],
): Promise<string> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) return 'Pattern-aware, data-driven, growing';

  const client = new Anthropic({ apiKey });

  const topPatterns = patterns
    .slice(0, 5)
    .map(p => `- ${p.name} (confidence ${(p.confidence * 100).toFixed(0)}%)`)
    .join('\n');

  const profileContext = profile
    ? `Salary day: ${profile.salary_day ?? 'unknown'}, Rent day: ${profile.rent_day ?? 'unknown'}`
    : 'Profile not configured';

  const context = [
    `Top spending patterns:\n${topPatterns || 'No patterns yet'}`,
    `Profile: ${profileContext}`,
    `This week's insights:\n${weekInsights.slice(0, 3).map(i => `- ${i}`).join('\n') || 'No insights'}`,
  ].join('\n\n');

  try {
    const msg = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 40,
      system:     DNA_SYSTEM,
      messages:   [{ role: 'user', content: context }],
    });

    const block = msg.content[0];
    return block?.type === 'text' ? block.text.trim() : 'Emerging financial identity';
  } catch {
    return 'Emerging financial identity';
  }
}
