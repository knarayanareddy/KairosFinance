import { useState, useEffect } from 'react';
import type { ExecutionPlan } from '../types';

interface Props {
  active: boolean;
  recording: boolean;
  plan: ExecutionPlan | null;
  onStart: () => void;
  onStop: () => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function VoiceOrb({ active, recording, plan, onStart, onStop, onConfirm, onClose }: Props) {
  const [wavePhase, setWavePhase] = useState(0);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setWavePhase(p => p + 1), 80);
    return () => clearInterval(id);
  }, [recording]);

  if (!active) {
    return (
      <button
        onClick={onStart}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          boxShadow: '0 4px 20px rgba(91,141,239,0.4)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = '0 6px 28px rgba(91,141,239,0.6)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(91,141,239,0.4)';
        }}
        title="Voice command"
      >
        🎙️
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      zIndex: 999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: '#0F172A',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '28px',
        padding: '40px 36px',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
        animation: 'slideUp 0.3s ease',
      }}>
        {!plan ? (
          <>
            {/* Orb */}
            <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 28px' }}>
              {recording && [1, 2, 3].map(ring => (
                <div key={ring} style={{
                  position: 'absolute',
                  inset: `-${ring * 14}px`,
                  borderRadius: '50%',
                  border: `1px solid rgba(91,141,239,${0.3 - ring * 0.08})`,
                  animation: `pingRing ${1 + ring * 0.3}s ease infinite`,
                  animationDelay: `${ring * 0.2}s`,
                }} />
              ))}
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: recording
                  ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)'
                  : 'rgba(91,141,239,0.15)',
                border: '2px solid rgba(91,141,239,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '44px',
                cursor: recording ? 'pointer' : 'default',
                transition: 'all 0.3s',
                boxShadow: recording ? '0 0 40px rgba(91,141,239,0.5)' : 'none',
              }}
                onClick={recording ? onStop : undefined}
              >
                🎙️
              </div>
            </div>

            {/* Wave bars */}
            {recording && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', marginBottom: '20px' }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} style={{
                    width: '3px',
                    background: '#5B8DEF',
                    borderRadius: '2px',
                    height: `${8 + Math.abs(Math.sin((wavePhase + i * 2) * 0.4)) * 24}px`,
                    transition: 'height 0.08s ease',
                  }} />
                ))}
              </div>
            )}

            <div style={{ fontSize: '18px', fontWeight: 700, color: '#F1F5F9', marginBottom: '8px' }}>
              {recording ? 'Listening...' : 'Processing...'}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>
              {recording ? 'Say your command, then tap the orb to stop' : 'BUNQSY is understanding your request'}
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '10px 24px',
                color: '#64748B',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>📋</div>
            <div style={{ fontSize: '11px', color: '#5B8DEF', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
              Execution Plan Ready
            </div>
            <div style={{ fontSize: '14px', color: '#94A3B8', lineHeight: 1.6, marginBottom: '20px', textAlign: 'left', padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', borderLeft: '3px solid #5B8DEF' }}>
              {plan.narratedText}
            </div>

            <div style={{ marginBottom: '20px' }}>
              {plan.steps.map(step => (
                <div key={step.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#64748B',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <span style={{ color: '#5B8DEF' }}>→</span>
                  <span>{step.description}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '11px', color: '#334155', marginBottom: '16px' }}>
              🔒 BUNQSY will only execute after your confirmation — single audited gateway
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {plan.status === 'EXECUTED' ? (
                <div style={{
                  flex: 1,
                  padding: '14px',
                  background: 'rgba(0,200,150,0.1)',
                  border: '1px solid rgba(0,200,150,0.3)',
                  borderRadius: '12px',
                  color: '#00C896',
                  fontWeight: 700,
                  fontSize: '14px',
                }}>
                  ✓ Payment Executed via bunq API
                </div>
              ) : (
                <>
                  <button
                    onClick={onConfirm}
                    style={{
                      flex: 1,
                      background: '#00C896',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '14px',
                      color: '#0F172A',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ✓ Confirm & Execute
                  </button>
                  <button
                    onClick={onClose}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '14px 20px',
                      color: '#64748B',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
