import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  BUNQSYScore,
  OracleVote,
  OracleVerdict,
  InterventionPayload,
  ForecastPoint,
  DreamBriefing,
  ExecutionPlan,
} from '../types';

function generateForecastData(baseBalance: number): ForecastPoint[] {
  const points: ForecastPoint[] = [];
  const today = new Date();
  let balance = baseBalance;

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const events: ForecastPoint['events'] = [];
    const dayOfMonth = date.getDate();

    // Rent on 1st
    if (dayOfMonth === 1 || (i === 0 && dayOfMonth > 25)) {
      const rentDay = 30 - (dayOfMonth - 1);
      if (rentDay === i) {
        events.push({ type: 'RENT', description: 'Monthly rent', amount: 950, probability: 1.0 });
        balance -= 950;
      }
    }
    if (i === 14) {
      events.push({ type: 'RENT', description: 'Monthly rent due', amount: 950, probability: 1.0 });
      balance -= 950;
    }
    // Salary on 25th-ish
    if (i === 20) {
      events.push({ type: 'SALARY', description: 'Salary landing', amount: 3200, probability: 0.95 });
      balance += 3200;
    }
    // Subscriptions
    if (i === 5 || i === 18) {
      events.push({ type: 'SUBSCRIPTION', description: 'Streaming services', amount: 28, probability: 1.0 });
      balance -= 28;
    }
    // Weekend impulse risk
    const day = date.getDay();
    if (day === 6 || day === 0) {
      events.push({ type: 'IMPULSE_RISK', description: 'Weekend spending risk', probability: 0.65 });
      balance -= 45;
    } else {
      balance -= 22;
    }

    const variance = balance * 0.08;
    points.push({
      date: dateStr,
      projectedBalance: Math.max(0, Math.round(balance)),
      lowerBound: Math.max(0, Math.round(balance - variance)),
      upperBound: Math.round(balance + variance),
      events,
    });
  }
  return points;
}

const ORACLE_AGENTS_IDLE: OracleVote[] = [
  { agent: 'Balance Sentinel', icon: '🏦', status: 'PENDING', confidence: 0, message: 'Monitoring...', timeMs: 0 },
  { agent: 'Velocity Analyzer', icon: '⚡', status: 'PENDING', confidence: 0, message: 'Monitoring...', timeMs: 0 },
  { agent: 'Pattern Matcher', icon: '🧠', status: 'PENDING', confidence: 0, message: 'Monitoring...', timeMs: 0 },
  { agent: 'Subscription Watcher', icon: '🔄', status: 'PENDING', confidence: 0, message: 'Monitoring...', timeMs: 0 },
  { agent: 'Rent Proximity Guard', icon: '🏠', status: 'PENDING', confidence: 0, message: 'Monitoring...', timeMs: 0 },
  { agent: 'Fraud Shadow', icon: '🔍', status: 'PENDING', confidence: 0, message: 'Monitoring...', timeMs: 0 },
];

export function useSimulation() {
  const [bunqsyScore, setBunqsyScore] = useState<BUNQSYScore>({
    score: 78,
    trend: 'stable',
    breakdown: { balance: 82, velocity: 71, goals: 79, upcoming: 81 },
    label: 'Healthy',
  });

  const [oracleVotes, setOracleVotes] = useState<OracleVote[]>(ORACLE_AGENTS_IDLE);
  const [oracleVerdict, setOracleVerdict] = useState<OracleVerdict | null>(null);
  const [oracleRunning, setOracleRunning] = useState(false);

  const [intervention, setIntervention] = useState<InterventionPayload | null>(null);
  const [fraudActive, setFraudActive] = useState(false);
  const [fraudBlocked, setFraudBlocked] = useState(false);

  const [forecast, setForecast] = useState<ForecastPoint[]>(() => generateForecastData(2147));
  const [dreamBriefing, setDreamBriefing] = useState<DreamBriefing | null>(null);
  const [dreamRunning, setDreamRunning] = useState(false);
  const [dreamModalOpen, setDreamModalOpen] = useState(false);

  const [voiceActive, setVoiceActive] = useState(false);
  const [voicePlan, setVoicePlan] = useState<ExecutionPlan | null>(null);
  const [voiceRecording, setVoiceRecording] = useState(false);

  const [salaryLanding, setSalaryLanding] = useState(false);
  const [salaryPlan, setSalaryPlan] = useState<ExecutionPlan | null>(null);

  const [heartbeatTick, setHeartbeatTick] = useState(0);
  const [lastTick, setLastTick] = useState(new Date());

  const tickRef = useRef(0);

  // Heartbeat every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      setHeartbeatTick(tickRef.current);
      setLastTick(new Date());
      // Slight score fluctuation
      setBunqsyScore(prev => ({
        ...prev,
        score: Math.max(40, Math.min(99, prev.score + (Math.random() > 0.5 ? 1 : -1))),
      }));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const runFraudOracle = useCallback(async () => {
    if (oracleRunning) return;
    setOracleRunning(true);
    setOracleVerdict(null);

    const resetVotes = ORACLE_AGENTS_IDLE.map(a => ({ ...a, status: 'RUNNING' as const }));
    setOracleVotes(resetVotes);

    const fraudVotes: Omit<OracleVote, 'status'>[] = [
      { agent: 'Balance Sentinel', icon: '🏦', confidence: 12, message: 'Balance sufficient — no anomaly', timeMs: 800 },
      { agent: 'Velocity Analyzer', icon: '⚡', confidence: 68, message: 'Unusual spend velocity at 2am', timeMs: 1400 },
      { agent: 'Pattern Matcher', icon: '🧠', confidence: 18, message: 'No matching historical pattern', timeMs: 1700 },
      { agent: 'Subscription Watcher', icon: '🔄', confidence: 5, message: 'Not a subscription event', timeMs: 2100 },
      { agent: 'Rent Proximity Guard', icon: '🏠', confidence: 22, message: 'Rent threshold not affected', timeMs: 2600 },
      { agent: 'Fraud Shadow', icon: '🔍', confidence: 92, message: '4 fraud signals: 2am, new payee, FX, round amount', timeMs: 3200 },
    ];

    const statuses: OracleVote['status'][] = ['CLEAR', 'WARN', 'CLEAR', 'CLEAR', 'CLEAR', 'INTERVENE'];

    for (let i = 0; i < fraudVotes.length; i++) {
      await new Promise(r => setTimeout(r, fraudVotes[i].timeMs));
      setOracleVotes(prev => {
        const updated = [...prev];
        updated[i] = { ...fraudVotes[i], status: statuses[i] };
        return updated;
      });
    }

    await new Promise(r => setTimeout(r, 600));
    setOracleVerdict({
      status: 'INTERVENE',
      riskScore: 84,
      narration: 'Fraud Shadow triggered INTERVENE at 92% confidence. Four concurrent fraud signals detected on this transaction.',
    });

    setBunqsyScore(prev => ({ ...prev, score: 51, trend: 'down', label: 'At Risk' }));
    setOracleRunning(false);

    // Show fraud block modal
    await new Promise(r => setTimeout(r, 800));
    setFraudActive(true);
  }, [oracleRunning]);

  const handleFraudBlock = useCallback(() => {
    setFraudActive(false);
    setFraudBlocked(true);
    setBunqsyScore(prev => ({ ...prev, score: 74, trend: 'up', label: 'Healthy' }));
    // Reset oracle after delay
    setTimeout(() => {
      setOracleVotes(ORACLE_AGENTS_IDLE);
      setOracleVerdict(null);
      setFraudBlocked(false);
    }, 3000);
  }, []);

  const handleFraudAllow = useCallback(() => {
    setFraudActive(false);
    setOracleVotes(ORACLE_AGENTS_IDLE);
    setOracleVerdict(null);
  }, []);

  const triggerDream = useCallback(async () => {
    if (dreamRunning) return;
    setDreamRunning(true);
    await new Promise(r => setTimeout(r, 3000 + Math.random() * 4000));

    const briefing: DreamBriefing = {
      sessionId: crypto.randomUUID(),
      briefingText: "Last night I analysed your last 7 days of spending. You're tracking well against your Amsterdam goal — you saved €140 more than last week. However, weekend dining costs have risen 23% over the past month. Your rent reserve is healthy and your salary lands in 5 days.",
      dnaCard: 'Disciplined saver, impulsive weekends, risk-aware',
      suggestions: [
        'Cap weekend dining at €80 this week — you\'ve averaged €127 over the past 4 weekends',
        'Move €200 to Amsterdam trip goal now — you\'re 68% funded with 6 weeks to go',
        'Cancel duplicate streaming subscription (Netflix + Disney+) — saving €12.99/month',
      ],
      completedAt: new Date().toISOString(),
    };

    setDreamBriefing(briefing);
    setDreamRunning(false);
    setDreamModalOpen(true);
  }, [dreamRunning]);

  const triggerVoice = useCallback(() => {
    setVoiceActive(true);
    setVoiceRecording(true);
    setVoicePlan(null);
  }, []);

  const stopVoice = useCallback(async () => {
    setVoiceRecording(false);
    await new Promise(r => setTimeout(r, 2500));
    const plan: ExecutionPlan = {
      id: crypto.randomUUID(),
      narratedText: 'I will send €20.00 to Sarah (IBAN: NL91 ABNA 0417 1643 00) from your primary account. This will leave your balance at €2,127.',
      steps: [{ id: '1', type: 'PAYMENT', description: 'Send €20.00 to Sarah' }],
      status: 'PENDING',
    };
    setVoicePlan(plan);
  }, []);

  const confirmVoicePlan = useCallback(() => {
    if (!voicePlan) return;
    setVoicePlan({ ...voicePlan, status: 'EXECUTED' });
    setTimeout(() => {
      setVoiceActive(false);
      setVoicePlan(null);
    }, 2000);
  }, [voicePlan]);

  const triggerSalary = useCallback(async () => {
    if (salaryLanding) return;
    setSalaryLanding(true);

    // Run a quick oracle pass
    setOracleRunning(true);
    const salaryVotes = ORACLE_AGENTS_IDLE.map(a => ({ ...a, status: 'RUNNING' as const }));
    setOracleVotes(salaryVotes);
    await new Promise(r => setTimeout(r, 1200));
    setOracleVotes(ORACLE_AGENTS_IDLE.map((a, i) => ({
      ...a,
      status: 'CLEAR' as const,
      confidence: [88, 72, 91, 65, 95, 30][i],
      message: ['Salary detected — balance healthy', 'Spend velocity normal', 'Salary pattern matched', 'Subscriptions current', 'Rent reserve adequate', 'No fraud signals'][i],
    })));
    setOracleVerdict({ status: 'CLEAR', riskScore: 12, narration: 'Salary landing confirmed. All agents clear. Running Savings Jar Agent.' });
    setBunqsyScore(prev => ({ ...prev, score: 88, trend: 'up', label: 'Excellent' }));
    setOracleRunning(false);

    await new Promise(r => setTimeout(r, 1000));

    const plan: ExecutionPlan = {
      id: crypto.randomUUID(),
      narratedText: 'Your salary of €3,200 just landed. I\'d like to distribute it as follows: €950 to rent reserve, €320 to emergency fund, €200 to Amsterdam trip goal. Remaining €1,730 stays in your primary account.',
      steps: [
        { id: '1', type: 'SAVINGS_TRANSFER', description: 'Transfer €950 to Rent Reserve' },
        { id: '2', type: 'SAVINGS_TRANSFER', description: 'Transfer €320 to Emergency Fund' },
        { id: '3', type: 'SAVINGS_TRANSFER', description: 'Transfer €200 to Amsterdam Trip Goal' },
      ],
      status: 'PENDING',
    };
    setSalaryPlan(plan);
    setIntervention({
      id: crypto.randomUUID(),
      type: 'SALARY_RECEIVED',
      title: '💰 Salary of €3,200 Landed',
      narration: plan.narratedText,
      severity: 'LOW',
      actionLabel: 'Confirm 3 transfers',
      dismissLabel: 'Dismiss',
      planId: plan.id,
    });
  }, [salaryLanding]);

  const confirmSalaryPlan = useCallback(() => {
    setIntervention(null);
    setSalaryLanding(false);
    setSalaryPlan(null);
    setOracleVotes(ORACLE_AGENTS_IDLE);
    setOracleVerdict(null);
    setForecast(generateForecastData(2797));
  }, []);

  const dismissIntervention = useCallback(() => {
    setIntervention(null);
    setSalaryLanding(false);
    setSalaryPlan(null);
  }, []);

  return {
    bunqsyScore,
    oracleVotes,
    oracleVerdict,
    oracleRunning,
    intervention,
    fraudActive,
    fraudBlocked,
    forecast,
    dreamBriefing,
    dreamRunning,
    dreamModalOpen,
    setDreamModalOpen,
    voiceActive,
    voicePlan,
    voiceRecording,
    salaryLanding,
    salaryPlan,
    heartbeatTick,
    lastTick,
    runFraudOracle,
    handleFraudBlock,
    handleFraudAllow,
    triggerDream,
    triggerVoice,
    stopVoice,
    confirmVoicePlan,
    triggerSalary,
    confirmSalaryPlan,
    dismissIntervention,
    setVoiceActive,
  };
}
