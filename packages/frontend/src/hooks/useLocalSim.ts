import { useState, useCallback } from 'react';

export interface SimVote {
  agent: string;
  icon: string;
  status: 'PENDING' | 'RUNNING' | 'CLEAR' | 'WARN' | 'INTERVENE';
  confidence: number;
  message: string;
}

export interface SimVerdict {
  status: 'CLEAR' | 'WARN' | 'INTERVENE';
  riskScore: number;
  narration: string;
}

export interface SalaryIntervention {
  title: string;
  narration: string;
  actionLabel: string;
}

const AGENTS_IDLE: SimVote[] = [
  { agent: 'Balance Sentinel',     icon: '🏦', status: 'PENDING', confidence: 0, message: 'Monitoring...' },
  { agent: 'Velocity Analyzer',    icon: '⚡', status: 'PENDING', confidence: 0, message: 'Monitoring...' },
  { agent: 'Pattern Matcher',      icon: '🧠', status: 'PENDING', confidence: 0, message: 'Monitoring...' },
  { agent: 'Subscription Watcher', icon: '🔄', status: 'PENDING', confidence: 0, message: 'Monitoring...' },
  { agent: 'Rent Proximity Guard', icon: '🏠', status: 'PENDING', confidence: 0, message: 'Monitoring...' },
  { agent: 'Fraud Shadow',         icon: '🔍', status: 'PENDING', confidence: 0, message: 'Monitoring...' },
];

export function useLocalSim() {
  const [votes, setVotes] = useState<SimVote[]>(AGENTS_IDLE);
  const [verdict, setVerdict] = useState<SimVerdict | null>(null);
  const [running, setRunning] = useState(false);
  const [fraudModalOpen, setFraudModalOpen] = useState(false);
  const [salaryIntervention, setSalaryIntervention] = useState<SalaryIntervention | null>(null);

  const runFraudOracle = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setVerdict(null);
    setFraudModalOpen(false);

    setVotes(AGENTS_IDLE.map(a => ({ ...a, status: 'RUNNING' as const })));
    void fetch('/api/demo/fraud', { method: 'POST' });

    const steps: Array<{ confidence: number; message: string; status: SimVote['status']; delayMs: number }> = [
      { confidence: 12, message: 'Balance sufficient — no anomaly',                          status: 'CLEAR',     delayMs: 800  },
      { confidence: 68, message: 'Unusual spend velocity at 2am',                            status: 'WARN',      delayMs: 1400 },
      { confidence: 18, message: 'No matching historical pattern',                           status: 'CLEAR',     delayMs: 1700 },
      { confidence:  5, message: 'Not a subscription event',                                 status: 'CLEAR',     delayMs: 2100 },
      { confidence: 22, message: 'Rent threshold not affected',                              status: 'CLEAR',     delayMs: 2600 },
      { confidence: 92, message: '4 fraud signals: 2am, new payee, FX, round amount',       status: 'INTERVENE', delayMs: 3200 },
    ];

    let elapsed = 0;
    for (let i = 0; i < steps.length; i++) {
      await new Promise<void>(r => setTimeout(r, steps[i].delayMs - elapsed));
      elapsed = steps[i].delayMs;
      const { confidence, message, status } = steps[i];
      const base = AGENTS_IDLE[i];
      setVotes(prev => {
        const next = [...prev];
        next[i] = { ...base, confidence, message, status };
        return next;
      });
    }

    await new Promise<void>(r => setTimeout(r, 600));
    setVerdict({
      status: 'INTERVENE',
      riskScore: 84,
      narration: 'Fraud Shadow triggered INTERVENE at 92% confidence. Four concurrent fraud signals detected on this transaction.',
    });
    setRunning(false);

    await new Promise<void>(r => setTimeout(r, 800));
    setFraudModalOpen(true);
  }, [running]);

  const runSalaryOracle = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setVerdict(null);
    setSalaryIntervention(null);

    setVotes(AGENTS_IDLE.map(a => ({ ...a, status: 'RUNNING' as const })));
    void fetch('/api/demo/salary', { method: 'POST' });

    const steps: Array<{ confidence: number; message: string; delayMs: number }> = [
      { confidence: 88, message: 'Salary detected — balance healthy', delayMs: 400  },
      { confidence: 72, message: 'Spend velocity normal',             delayMs: 700  },
      { confidence: 91, message: 'Salary pattern matched',            delayMs: 900  },
      { confidence: 65, message: 'Subscriptions current',             delayMs: 1100 },
      { confidence: 95, message: 'Rent reserve adequate',             delayMs: 1200 },
      { confidence: 30, message: 'No fraud signals',                  delayMs: 1400 },
    ];

    let elapsed = 0;
    for (let i = 0; i < steps.length; i++) {
      await new Promise<void>(r => setTimeout(r, steps[i].delayMs - elapsed));
      elapsed = steps[i].delayMs;
      const { confidence, message } = steps[i];
      setVotes(prev => {
        const next = [...prev];
        next[i] = { ...AGENTS_IDLE[i], confidence, message, status: 'CLEAR' };
        return next;
      });
    }

    await new Promise<void>(r => setTimeout(r, 400));
    setVerdict({
      status: 'CLEAR',
      riskScore: 12,
      narration: 'Salary landing confirmed. All agents clear. Running Savings Jar Agent.',
    });
    setRunning(false);

    await new Promise<void>(r => setTimeout(r, 800));
    setSalaryIntervention({
      title: '💰 Salary of €3,500 Landed',
      narration: "Your salary of €3,500 just landed. I'd like to distribute it as follows: €1,250 to rent reserve, €350 to emergency fund, €200 to Amsterdam trip goal. Remaining €1,700 stays in your primary account.",
      actionLabel: 'Confirm 3 transfers',
    });
  }, [running]);

  const resetOracle = useCallback(() => {
    setVotes(AGENTS_IDLE);
    setVerdict(null);
    setFraudModalOpen(false);
    setSalaryIntervention(null);
  }, []);

  return {
    votes,
    verdict,
    running,
    fraudModalOpen,
    salaryIntervention,
    runFraudOracle,
    runSalaryOracle,
    resetOracle,
    setFraudModalOpen,
    setSalaryIntervention,
  };
}
