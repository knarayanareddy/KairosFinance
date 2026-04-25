export async function textToSpeech(text: string): Promise<Buffer> {
  const apiKey = process.env['ELEVENLABS_API_KEY'];
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set');

  // Override via ELEVENLABS_VOICE_ID env var; Sarah is a clear, professional voice
  const voiceId = process.env['ELEVENLABS_VOICE_ID'] ?? 'EXAVITQu4vr4xnSDxMaL';

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs TTS error ${response.status}: ${err}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
