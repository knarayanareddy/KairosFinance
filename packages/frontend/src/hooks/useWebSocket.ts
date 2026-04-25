import { useEffect, useRef, useState, useCallback } from 'react';
import type { WSMessage, BUNQSYScore, OracleVote, OracleVerdict, InterventionPayload, DreamBriefingPayload, ScoreDeltaExplainPayload } from '@bunqsy/shared';

export interface WSState {
  connected: boolean;
  score: BUNQSYScore | null;
  scoreDelta: ScoreDeltaExplainPayload | null;
  votes: OracleVote[];
  verdict: OracleVerdict | null;
  intervention: InterventionPayload | null;
  dreamBriefing: DreamBriefingPayload | null;
  lastTick: string | null;
}

const INITIAL_STATE: WSState = {
  connected: false,
  score: null,
  scoreDelta: null,
  votes: [],
  verdict: null,
  intervention: null,
  dreamBriefing: null,
  lastTick: null,
};

export function useWebSocket(): WSState {
  const [state, setState] = useState<WSState>(INITIAL_STATE);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setState(s => ({ ...s, connected: true }));
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      let msg: WSMessage;
      try {
        msg = JSON.parse(event.data) as WSMessage;
      } catch {
        return;
      }

      setState(s => {
        switch (msg.type) {
          case 'score_update':
            return { ...s, score: msg.payload };
          case 'score_delta_explain':
            return { ...s, scoreDelta: msg.payload };
          case 'oracle_vote':
            // Reset vote list on new oracle cycle
            const isNewCycle = s.verdict !== null;
            return {
              ...s,
              votes: isNewCycle ? [msg.payload] : [...s.votes.slice(-5), msg.payload],
              verdict: null
            };
          case 'oracle_verdict':
            return { ...s, verdict: msg.payload };
          case 'intervention':
            return { ...s, intervention: msg.payload };
          case 'dream_complete':
            return { ...s, dreamBriefing: msg.payload };
          case 'tick':
            return { ...s, lastTick: msg.payload.timestamp };
          default:
            return s;
        }
      });
    };

    ws.onclose = () => {
      setState(s => ({ ...s, connected: false }));
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return state;
}
