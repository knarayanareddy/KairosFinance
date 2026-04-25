// ElevenLabs TTS — eleven_turbo_v2_5 requires Creator plan or above (100k+ credits).
const MODEL_ID  = process.env['ELEVENLABS_MODEL_ID'] ?? 'eleven_turbo_v2_5';
const MAX_CHARS = 2000; // ElevenLabs hard limit varies by plan; stay well under it

export async function textToSpeech(text: string): Promise<Buffer> {
  const apiKey = process.env['ELEVENLABS_API_KEY'];
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set');

  const voiceId = process.env['ELEVENLABS_VOICE_ID'] ?? 'EXAVITQu4vr4xnSDxMaL';

  // Truncate to avoid 400s from over-length requests
  const safeText = text.trim().slice(0, MAX_CHARS);
  if (!safeText) throw new Error('Empty text passed to TTS');

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: safeText,
      model_id: MODEL_ID,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs TTS error ${response.status}: ${err}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
