import { useState, useRef, useCallback, useEffect } from 'react';

type OrbState = 'idle' | 'recording' | 'processing' | 'plan_ready' | 'response_ready' | 'error';

interface VoicePlan {
  kind: 'plan';
  planId: string;
  narratedText: string;
  steps: Array<{ id: string; type: string; description: string }>;
  transcript: string;
}

interface VoiceResponse {
  kind: 'response' | 'confirmed' | 'denied';
  action?: string;
  spokenResponse: string;
  transcript: string;
}

type VoiceResult = VoicePlan | VoiceResponse;

interface ActiveIntervention {
  id: string;
  planId?: string | null;
}

interface Props {
  onPlanConfirmed?: (planId: string) => void;
  activeIntervention?: ActiveIntervention | null;
}

export function VoiceOrb({ onPlanConfirmed, activeIntervention }: Props): React.JSX.Element {
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [plan, setPlan] = useState<VoicePlan | null>(null);
  const [responseMsg, setResponseMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmingPlan, setConfirmingPlan] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const responseDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (responseDismissTimer.current) clearTimeout(responseDismissTimer.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(100);
      setOrbState('recording');
    } catch {
      setErrorMsg('Microphone access denied');
      setOrbState('error');
      setTimeout(() => setOrbState('idle'), 2000);
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    recorder.onstop = async () => {
      streamRef.current?.getTracks().forEach(t => t.stop());

      const mimeType = recorder.mimeType;
      const blob = new Blob(chunksRef.current, { type: mimeType });

      if (blob.size < 1000) {
        setErrorMsg('Recording too short — try again');
        setOrbState('error');
        setTimeout(() => setOrbState('idle'), 2500);
        return;
      }

      setOrbState('processing');

      try {
        const formData = new FormData();
        const ext = mimeType.includes('webm') ? '.webm' : '.mp4';
        formData.append('audio', blob, `voice${ext}`);

        // Pass context so the backend can route confirm/deny to the right plan/intervention
        if (pendingPlanId) formData.append('pendingPlanId', pendingPlanId);
        if (activeIntervention?.id) formData.append('activeInterventionId', activeIntervention.id);
        if (activeIntervention?.planId) formData.append('activeInterventionPlanId', activeIntervention.planId);

        const res = await fetch('/api/voice', { method: 'POST', body: formData });
        const data = await res.json() as unknown;

        if (!res.ok) {
          const err = (data as { error?: string }).error ?? `HTTP ${res.status}`;
          throw new Error(err);
        }

        const result = data as VoiceResult;

        if (result.kind === 'plan') {
          setPlan(result);
          setPendingPlanId(result.planId);
          setOrbState('plan_ready');
          void speakText(result.narratedText);
        } else {
          if (result.kind === 'confirmed' || result.kind === 'denied') {
            setPendingPlanId(null);
          }
          setResponseMsg(result.spokenResponse);
          setOrbState('response_ready');
          void speakText(result.spokenResponse);
          responseDismissTimer.current = setTimeout(() => {
            setResponseMsg('');
            setOrbState('idle');
          }, 5000);
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Voice command failed');
        setOrbState('error');
        setTimeout(() => setOrbState('idle'), 3000);
      }
    };

    recorder.stop();
  }, [pendingPlanId, activeIntervention]);

  const handlePointerDown = useCallback(() => {
    if (orbState === 'idle') void startRecording();
  }, [orbState, startRecording]);

  const handlePointerUp = useCallback(() => {
    if (orbState === 'recording') stopRecording();
  }, [orbState, stopRecording]);

  async function handleConfirm(): Promise<void> {
    if (!plan) return;
    setConfirmingPlan(true);
    try {
      const res = await fetch(`/api/confirm/${plan.planId}`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onPlanConfirmed?.(plan.planId);
      setPlan(null);
      setPendingPlanId(null);
      setOrbState('idle');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Confirm failed');
      setOrbState('error');
      setTimeout(() => {
        setPlan(null);
        setPendingPlanId(null);
        setOrbState('idle');
      }, 2500);
    } finally {
      setConfirmingPlan(false);
    }
  }

  function handleCancel(): void {
    setPlan(null);
    setPendingPlanId(null);
    setOrbState('idle');
  }

  function handleDismissResponse(): void {
    if (responseDismissTimer.current) clearTimeout(responseDismissTimer.current);
    setResponseMsg('');
    setOrbState('idle');
  }

  return (
    <div style={styles.wrapper}>
      {orbState === 'plan_ready' && plan && (
        <PlanCard
          plan={plan}
          onConfirm={() => { void handleConfirm(); }}
          onCancel={handleCancel}
          confirming={confirmingPlan}
        />
      )}

      {orbState === 'response_ready' && responseMsg && (
        <ResponseCard text={responseMsg} onDismiss={handleDismissResponse} />
      )}

      {orbState === 'error' && (
        <div style={styles.errorMsg}>{errorMsg}</div>
      )}

      {activeIntervention && orbState === 'idle' && (
        <div style={styles.interventionHint}>
          Alert active — say "deny" to block or "authorize" to allow
        </div>
      )}

      <div
        style={orbStyle(orbState)}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        role="button"
        aria-label="Hold to record voice command"
      >
        <OrbInner state={orbState} />
      </div>

      <span style={styles.hint}>{hintText(orbState, !!pendingPlanId)}</span>
    </div>
  );
}

// ─── ElevenLabs TTS playback ──────────────────────────────────────────────────

export async function speakText(text: string): Promise<void> {
  try {
    const res = await fetch('/api/voice/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    void audio.play();
  } catch {
    // TTS is non-fatal — voice playback failure shouldn't break the UI
  }
}

// ─── Inner orb visual ─────────────────────────────────────────────────────────

function OrbInner({ state }: { state: OrbState }): React.JSX.Element {
  if (state === 'recording') {
    return (
      <div style={innerStyles.recordingRings}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ ...innerStyles.ring, animationDelay: `${i * 200}ms` }} />
        ))}
        <div style={innerStyles.micDot} />
      </div>
    );
  }
  if (state === 'processing') return <div style={innerStyles.spinner} />;
  if (state === 'plan_ready') return <div style={innerStyles.checkmark}>✓</div>;
  if (state === 'response_ready') return <div style={innerStyles.checkmark}>✓</div>;
  if (state === 'error') return <div style={innerStyles.errorIcon}>✕</div>;
  return <div style={innerStyles.micIcon}>🎙</div>;
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan, onConfirm, onCancel, confirming,
}: {
  plan: VoicePlan;
  onConfirm: () => void;
  onCancel: () => void;
  confirming: boolean;
}): React.JSX.Element {
  return (
    <div className="glass" style={cardStyles.card}>
      <div style={cardStyles.header}>
        <span style={cardStyles.title}>Voice Plan Ready</span>
        {plan.transcript && (
          <span style={cardStyles.transcript}>"{plan.transcript}"</span>
        )}
      </div>

      <p style={cardStyles.narration}>{plan.narratedText}</p>

      {plan.steps.length > 0 && (
        <div style={cardStyles.steps}>
          {plan.steps.map((step, i) => (
            <div key={step.id} style={cardStyles.stepRow}>
              <span style={cardStyles.stepIndex}>{i + 1}</span>
              <div style={cardStyles.stepBody}>
                <span style={cardStyles.stepType}>{step.type}</span>
                <span style={cardStyles.stepDesc}>{step.description}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {plan.steps.length === 0 && (
        <div style={cardStyles.noSteps}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            No executable steps — nothing to confirm
          </span>
        </div>
      )}

      <div style={cardStyles.hint}>
        Say <strong>"yes"</strong> to confirm or <strong>"no"</strong> to cancel
      </div>

      <div style={cardStyles.actions}>
        <button style={cardStyles.cancelBtn} onClick={onCancel} disabled={confirming}>
          Cancel
        </button>
        {plan.steps.length > 0 && (
          <button
            style={{
              ...cardStyles.confirmBtn,
              opacity: confirming ? 0.6 : 1,
              cursor: confirming ? 'wait' : 'pointer',
            }}
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? 'Executing…' : 'Confirm & Execute'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Response card (system commands, confirm/deny feedback) ───────────────────

function ResponseCard({ text, onDismiss }: { text: string; onDismiss: () => void }): React.JSX.Element {
  return (
    <div className="glass" style={cardStyles.card}>
      <div style={cardStyles.header}>
        <span style={cardStyles.title}>Voice Response</span>
      </div>
      <p style={cardStyles.narration}>{text}</p>
      <div style={cardStyles.actions}>
        <button style={cardStyles.cancelBtn} onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hintText(state: OrbState, hasPendingPlan: boolean): string {
  switch (state) {
    case 'idle':           return hasPendingPlan ? 'Say "yes" or "no"' : 'Hold to speak';
    case 'recording':      return 'Release to send';
    case 'processing':     return 'Processing…';
    case 'plan_ready':     return 'Say "yes" to confirm';
    case 'response_ready': return 'Done';
    case 'error':          return '';
  }
}

function orbStyle(state: OrbState): React.CSSProperties {
  const base: React.CSSProperties = {
    width: 80,
    height: 80,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: state === 'idle' ? 'pointer' : 'default',
    userSelect: 'none',
    touchAction: 'none',
    position: 'relative',
    transition: 'transform 0.2s ease, box-shadow 0.3s ease',
    flexShrink: 0,
  };

  switch (state) {
    case 'idle':
      return {
        ...base,
        background: 'radial-gradient(circle at 35% 35%, #818cf8, #6366f1)',
        boxShadow: '0 0 24px rgba(99,102,241,0.5), 0 0 48px rgba(99,102,241,0.2)',
        animation: 'glowPulse 3s ease-in-out infinite',
      };
    case 'recording':
      return {
        ...base,
        background: 'radial-gradient(circle at 35% 35%, #f87171, #ef4444)',
        boxShadow: '0 0 32px rgba(239,68,68,0.6), 0 0 64px rgba(239,68,68,0.25)',
        transform: 'scale(1.1)',
      };
    case 'processing':
      return {
        ...base,
        background: 'transparent',
        border: '3px solid transparent',
        backgroundClip: 'padding-box',
        boxShadow: '0 0 20px rgba(99,102,241,0.4)',
      };
    case 'plan_ready':
      return {
        ...base,
        background: 'radial-gradient(circle at 35% 35%, #4ade80, #22c55e)',
        boxShadow: '0 0 24px rgba(74,222,128,0.5)',
        transform: 'scale(0.9)',
      };
    case 'response_ready':
      return {
        ...base,
        background: 'radial-gradient(circle at 35% 35%, #60a5fa, #3b82f6)',
        boxShadow: '0 0 24px rgba(96,165,250,0.5)',
        transform: 'scale(0.9)',
      };
    case 'error':
      return {
        ...base,
        background: 'radial-gradient(circle at 35% 35%, #f87171, #dc2626)',
        boxShadow: '0 0 24px rgba(220,38,38,0.5)',
      };
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  hint: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.08em',
    height: 16,
  },
  errorMsg: {
    fontSize: '0.75rem',
    color: 'var(--color-red)',
    textAlign: 'center',
    maxWidth: 260,
    animation: 'fadeSlideUp 0.3s ease both',
  },
  interventionHint: {
    fontSize: '0.7rem',
    color: '#f59e0b',
    textAlign: 'center',
    maxWidth: 260,
    padding: '6px 10px',
    borderRadius: '8px',
    background: 'rgba(245,158,11,0.08)',
    border: '1px solid rgba(245,158,11,0.2)',
    animation: 'fadeSlideUp 0.3s ease both',
  },
};

const innerStyles: Record<string, React.CSSProperties> = {
  micIcon: {
    fontSize: '1.5rem',
    lineHeight: 1,
  },
  recordingRings: {
    position: 'relative',
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.7)',
    animation: 'pulse 1.2s ease-out infinite',
  },
  micDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: 'white',
  },
  spinner: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '3px solid rgba(255,255,255,0.15)',
    borderTopColor: 'white',
    animation: 'spin 0.8s linear infinite',
  },
  checkmark: {
    fontSize: '1.8rem',
    color: 'white',
    fontWeight: 700,
  },
  errorIcon: {
    fontSize: '1.5rem',
    color: 'white',
    fontWeight: 700,
  },
};

const cardStyles: Record<string, React.CSSProperties> = {
  card: {
    padding: '20px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    animation: 'fadeSlideUp 0.35s ease both',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  title: {
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: 'var(--accent-blue)',
  },
  transcript: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  narration: {
    fontSize: '0.88rem',
    lineHeight: 1.55,
    color: 'var(--text-primary)',
  },
  hint: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    textAlign: 'center' as const,
  },
  steps: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  stepRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-surface-alt)',
  },
  stepIndex: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: 'var(--accent-blue)',
    color: 'white',
    fontSize: '0.65rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  },
  stepType: {
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--accent-blue)',
    textTransform: 'uppercase' as const,
  },
  stepDesc: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  noSteps: {
    padding: '8px 0',
    textAlign: 'center' as const,
  },
  actions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '0.78rem',
    cursor: 'pointer',
  },
  confirmBtn: {
    padding: '8px 18px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--accent-blue)',
    color: 'white',
    fontSize: '0.78rem',
    fontWeight: 700,
    transition: 'var(--transition)',
  },
};
