import { useState, useEffect } from 'react';
import type { DreamBriefingPayload } from '@bunqsy/shared';

type TriggerState = 'idle' | 'running' | 'complete';

interface Props {
  dreamBriefing: DreamBriefingPayload | null;
  onOpenBriefing: () => void;
}

export function DreamTrigger({ dreamBriefing, onOpenBriefing }: Props): React.JSX.Element {
  const [state, setState] = useState<TriggerState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // When a dream_complete WS message arrives while we're running, transition to complete
  useEffect(() => {
    if (state === 'running' && dreamBriefing) {
      setState('complete');
    }
  }, [dreamBriefing, state]);

  async function handleTrigger(): Promise<void> {
    if (state !== 'idle') return;
    setError('');
    setState('running');

    try {
      const res = await fetch('/api/dream/trigger', { method: 'POST' });
      const data = await res.json() as unknown;

      if (!res.ok && res.status !== 409) {
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      // 409 = already running — still show running state
      setSessionId((data as { sessionId?: string }).sessionId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Dream Mode');
      setState('idle');
    }
  }

  function handleViewBriefing(): void {
    onOpenBriefing();
  }

  function handleReset(): void {
    setState('idle');
    setSessionId(null);
    setError('');
  }

  return (
    <div className="glass" style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>Dream Mode</span>
        {state === 'running' && (
          <span style={styles.sessionId}>
            {sessionId ? `#${sessionId.slice(0, 8)}` : ''}
          </span>
        )}
      </div>

      <p style={styles.description}>
        Run offline AI analysis at 2am, or trigger now for an instant financial briefing,
        pattern updates, and your personalised DNA card.
      </p>

      {error && <span style={styles.error}>{error}</span>}

      {state === 'idle' && (
        <button style={styles.triggerBtn} onClick={() => { void handleTrigger(); }}>
          <span style={styles.btnIcon}>💤</span>
          Trigger Dream Mode Now
        </button>
      )}

      {state === 'running' && (
        <div style={styles.runningRow}>
          <MoonAnimation />
          <span style={styles.runningText}>
            Dreaming… this takes up to 2 minutes
          </span>
        </div>
      )}

      {state === 'complete' && (
        <div style={styles.completeRow}>
          <button style={styles.viewBtn} onClick={handleViewBriefing}>
            <span>✨</span> View Your Briefing
          </button>
          <button style={styles.resetLink} onClick={handleReset}>reset</button>
        </div>
      )}
    </div>
  );
}

function MoonAnimation(): React.JSX.Element {
  return (
    <div style={moonStyles.wrap}>
      <span style={moonStyles.moon}>🌙</span>
      {['✦', '·', '✦', '·', '✦'].map((s, i) => (
        <span
          key={i}
          style={{
            ...moonStyles.star,
            animationDelay: `${i * 0.4}s`,
            top:  `${20 + Math.sin(i * 72 * Math.PI / 180) * 14}px`,
            left: `${20 + Math.cos(i * 72 * Math.PI / 180) * 14}px`,
          }}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: '22px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    animation: 'fadeSlideUp 0.5s 0.35s ease both',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-secondary)',
  },
  sessionId: {
    fontSize: '0.62rem',
    color: 'var(--text-muted)',
    fontFamily: 'monospace',
  },
  description: {
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.55,
  },
  error: {
    fontSize: '0.72rem',
    color: 'var(--color-red)',
  },
  triggerBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '11px 0',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(99,102,241,0.4)',
    background: 'rgba(99,102,241,0.12)',
    color: 'var(--accent-blue)',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'var(--transition)',
    width: '100%',
  },
  btnIcon: { fontSize: '1rem' },
  runningRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 0',
  },
  runningText: {
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
  },
  completeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  viewBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 0',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 0 20px rgba(99,102,241,0.4)',
  },
  resetLink: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '0.7rem',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '0 4px',
  },
};

const moonStyles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'relative',
    width: 40,
    height: 40,
    flexShrink: 0,
  },
  moon: {
    position: 'absolute',
    fontSize: '1.4rem',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    animation: 'pulse 2s ease-in-out infinite',
  },
  star: {
    position: 'absolute',
    fontSize: '0.5rem',
    color: 'var(--text-muted)',
    animation: 'pulse 2s ease-in-out infinite',
  },
};
