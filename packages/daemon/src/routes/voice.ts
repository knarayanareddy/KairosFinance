import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../memory/db.js';
import { transcribeAudio } from '../voice/stt.js';
import { textToSpeech } from '../voice/tts.js';
import { planFromTranscript } from '../voice/planner.js';
import { createExecutionPlan } from '../bunq/execute.js';
import { wsEmit } from './ws.js';
import type { ScoreLogRow, UserProfileRow } from '@bunqsy/shared';

interface AccountRow {
  jar_account_id: number;
  name: string;
  current_amount: number;
}

function buildPlannerContext(db: ReturnType<typeof getDb>): Parameters<typeof planFromTranscript>[1] {
  const latestScore = db
    .prepare(`SELECT * FROM score_log ORDER BY logged_at DESC LIMIT 1`)
    .get() as ScoreLogRow | undefined;

  const profile = db
    .prepare(`SELECT * FROM user_profile WHERE id = 1`)
    .get() as UserProfileRow | undefined;

  // Build account list from goals with linked jar accounts
  const jarAccounts = db
    .prepare(`SELECT jar_account_id, name, current_amount FROM goals WHERE jar_account_id IS NOT NULL AND enabled = 1`)
    .all() as AccountRow[];

  // Use salary_amount as a proxy when we don't have a live balance read.
  // The planner only needs approximate scale (e.g. to flag an impossible "send €50k").
  const salaryAmt = profile?.salary_amount ?? null;
  const balanceScore = latestScore?.balance_component ?? 50; // 0-100
  const estimatedBalance = salaryAmt !== null
    ? salaryAmt * (balanceScore / 100)  // rough: fraction of salary
    : balanceScore * 20;                // fallback: scale to €0-2000

  return {
    balanceEur: estimatedBalance,
    accounts: jarAccounts.map(g => ({
      id: g.jar_account_id,
      description: g.name,
      balanceEur: g.current_amount,
    })),
  };
}

export async function registerVoiceRoute(fastify: FastifyInstance): Promise<void> {
  // ── POST /api/voice ─────────────────────────────────────────────────────────
  fastify.post('/api/voice', async (req: FastifyRequest, reply: FastifyReply) => {
    const uploaded = await req.file();

    if (!uploaded) {
      return reply.status(400).send({ error: 'No audio file uploaded' });
    }

    const audioBuffer = await uploaded.toBuffer();
    const mimeType = uploaded.mimetype || 'audio/webm';

    if (audioBuffer.length === 0) {
      return reply.status(400).send({ error: 'Audio file is empty' });
    }

    // ── Step 1: Speech-to-text ────────────────────────────────────────────────
    let transcript: string;
    try {
      transcript = await transcribeAudio(audioBuffer, mimeType);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[voice] STT failed:', message);
      return reply.status(502).send({ error: `Transcription failed: ${message}` });
    }

    if (!transcript) {
      return reply.status(422).send({ error: 'No speech detected in audio' });
    }

    // ── Step 2: Plan from transcript ─────────────────────────────────────────
    const db = getDb();
    const context = buildPlannerContext(db);

    const { narratedText, steps } = await planFromTranscript(transcript, context);

    // ── Step 3: Persist plan (status = PENDING) — via the write gateway ──────
    const plan = await createExecutionPlan(steps, narratedText);

    // ── Step 4: Broadcast plan over WebSocket ─────────────────────────────────
    wsEmit({ type: 'plan_update', payload: plan });

    // ── Step 5: Return to frontend ────────────────────────────────────────────
    return reply.send({
      planId: plan.id,
      narratedText: plan.narratedText,
      steps: plan.steps,
      transcript,
    });
  });

  // ── POST /api/voice/speak ──────────────────────────────────────────────────
  fastify.post('/api/voice/speak', async (req: FastifyRequest, reply: FastifyReply) => {
    const { text } = req.body as { text?: string };
    if (!text?.trim()) {
      return reply.status(400).send({ error: 'text is required' });
    }

    try {
      const audioBuffer = await textToSpeech(text.trim());
      return reply
        .header('Content-Type', 'audio/mpeg')
        .header('Content-Length', String(audioBuffer.length))
        .send(audioBuffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[voice] TTS failed:', message);
      return reply.status(502).send({ error: message });
    }
  });
}
