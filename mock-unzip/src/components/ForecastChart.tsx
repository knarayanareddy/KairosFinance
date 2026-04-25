
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { ForecastPoint } from '../types';

interface Props {
  data: ForecastPoint[];
}

const eventIcons: Record<string, string> = {
  RENT: '🏠',
  SALARY: '💰',
  SUBSCRIPTION: '🔄',
  IMPULSE_RISK: '⚡',
  GOAL_MILESTONE: '🎯',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const point: ForecastPoint = payload[0]?.payload;
  if (!point) return null;

  return (
    <div style={{
      background: '#0F172A',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '12px',
      padding: '14px 16px',
      minWidth: '200px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px', fontWeight: 600 }}>
        {new Date(label).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
      </div>
      <div style={{ fontSize: '20px', fontWeight: 800, color: '#F1F5F9', marginBottom: '4px' }}>
        €{point.projectedBalance.toLocaleString()}
      </div>
      <div style={{ fontSize: '11px', color: '#475569', marginBottom: '10px' }}>
        Range: €{point.lowerBound.toLocaleString()} – €{point.upperBound.toLocaleString()}
      </div>
      {point.events.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {point.events.map((e, i) => (
            <div key={i} style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{eventIcons[e.type] || '•'}</span>
              <span>{e.description}</span>
              {e.amount && <span style={{ color: e.type === 'SALARY' ? '#00C896' : '#FF6B7A', fontWeight: 600 }}>
                {e.type === 'SALARY' ? '+' : '-'}€{e.amount}
              </span>}
              <span style={{ color: '#334155', marginLeft: 'auto' }}>{Math.round(e.probability * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CustomDot = ({ cx, cy, payload }: any) => {
  if (!payload?.events?.length) return null;
  const hasRisk = payload.events.some((e: any) => e.type === 'IMPULSE_RISK' || e.type === 'RENT');
  if (!hasRisk) return null;
  return (
    <circle cx={cx} cy={cy} r={4} fill={hasRisk ? '#FF4757' : '#F5A623'} stroke="#0F172A" strokeWidth={2} />
  );
};

export function ForecastChart({ data }: Props) {
  const rentThreshold = 950;
  const day30Balance = data[data.length - 1]?.projectedBalance ?? 0;
  const riskDay = data.findIndex(d => d.projectedBalance < rentThreshold + 200);

  const chartData = data.map((point, i) => ({
    ...point,
    dayLabel: i === 0 ? 'Today' : i === 14 ? 'Day 14' : i === 29 ? 'Day 30' : `D${i + 1}`,
  }));

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px',
      padding: '28px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
            30-DAY FORECAST
          </div>
          <div style={{ fontSize: '15px', color: '#E2E8F0', fontWeight: 500 }}>
            In 30 days, you're projected to have{' '}
            <span style={{ color: day30Balance > rentThreshold ? '#00C896' : '#FF4757', fontWeight: 700 }}>
              ~€{day30Balance.toLocaleString()}
            </span>
          </div>
          {riskDay > 0 && (
            <div style={{ fontSize: '12px', color: '#F5A623', marginTop: '4px' }}>
              ⚠️ Balance drops near rent threshold on Day {riskDay + 1}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#64748B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '24px', height: '2px', background: '#5B8DEF', borderRadius: '1px' }} />
            Projected
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '24px', height: '8px', background: 'rgba(91,141,239,0.15)', borderRadius: '2px' }} />
            80% Band
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '24px', height: '2px', background: '#FF4757', borderRadius: '1px', borderTop: '1px dashed #FF4757' }} />
            Rent line
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5B8DEF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#5B8DEF" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5B8DEF" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#5B8DEF" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="dayLabel"
              tick={{ fontSize: 10, fill: '#334155' }}
              axisLine={false}
              tickLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#334155' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `€${(v / 1000).toFixed(1)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={rentThreshold}
              stroke="#FF4757"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: '🏠 Rent', position: 'insideTopRight', fontSize: 10, fill: '#FF4757' }}
            />
            <Area
              type="monotone"
              dataKey="upperBound"
              stroke="none"
              fill="url(#bandGrad)"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="lowerBound"
              stroke="none"
              fill="#0F172A"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="projectedBalance"
              stroke="#5B8DEF"
              strokeWidth={2}
              fill="url(#balanceGrad)"
              dot={<CustomDot />}
              activeDot={{ r: 5, fill: '#5B8DEF', stroke: '#0F172A', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Event legend */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {[
          { icon: '🏠', label: 'Rent', color: '#FF4757' },
          { icon: '💰', label: 'Salary', color: '#00C896' },
          { icon: '🔄', label: 'Subscription', color: '#5B8DEF' },
          { icon: '⚡', label: 'Impulse risk', color: '#F5A623' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}>
            <span>{item.icon}</span>
            <span style={{ color: item.color }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
