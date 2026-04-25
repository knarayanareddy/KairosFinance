export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env['ELEVENLABS_API_KEY'];
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set');

  const ext = mimeType.includes('webm') ? '.webm'
    : mimeType.includes('mp4')  ? '.mp4'
    : mimeType.includes('wav')  ? '.wav'
    : mimeType.includes('ogg')  ? '.ogg'
    : '.webm';

  const formData = new FormData();
  formData.append('audio', new Blob([new Uint8Array(audioBuffer)], { type: mimeType }), `audio${ext}`);
  formData.append('model_id', 'scribe_v1');
  formData.append('language_code', 'en');

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs STT error ${response.status}: ${err}`);
  }

  const result = await response.json() as { text?: string };
  return (result.text ?? '').trim();
}
