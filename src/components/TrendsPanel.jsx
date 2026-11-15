import { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { getMissionHistory } from '../lib/storage.js';

export default function TrendsPanel({ crewId, beginner = true }) {
  const [days, setDays] = useState(14);
  const [metricTab, setMetricTab] = useState('musculoskeletal'); // musculoskeletal | circadian | cognitive

  const data = getMissionHistory(crewId, days);

  return (
    <section className="panel" aria-label="Longitudinal mission trends">
      <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Longitudinal Health Trends</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--muted, #94a3b8)' }}>
            Multi-day physiological progression across long-duration exploration.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div className="seg" role="group" aria-label="Time window">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                className="btn sm"
                aria-pressed={days === d}
                onClick={() => setDays(d)}
              >
                {d} Days
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Metric category">
            {[
              ['musculoskeletal', 'Bones & Muscle'],
              ['circadian', 'Sleep & HRV'],
              ['cognitive', 'Alertness & Dose'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="btn sm"
                aria-pressed={metricTab === id}
                onClick={() => setMetricTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.18)', borderRadius: '8px', padding: '12px 6px 6px 0' }}>
        {metricTab === 'musculoskeletal' && (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--line, rgba(255,255,255,0.08))" vertical={false} />
              <XAxis dataKey="dateLabel" stroke="var(--muted, #94a3b8)" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" stroke="#38bdf8" tick={{ fontSize: 11 }} domain={[0, 'dataMax + 0.5']} unit="%" />
              <YAxis yAxisId="right" orientation="right" stroke="#34d399" tick={{ fontSize: 11 }} domain={[0, 160]} unit="m" />
              <Tooltip contentStyle={{ background: 'var(--surface, #1e293b)', border: '1px solid var(--line, #334155)', borderRadius: 6, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
              <Line yAxisId="left" type="monotone" dataKey="bone" name="Bone Loss (%)" stroke="#fb923c" strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="muscle" name="Muscle Loss (%)" stroke="#38bdf8" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="exercise" name="Exercise Done (min)" stroke="#34d399" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {metricTab === 'circadian' && (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--line, rgba(255,255,255,0.08))" vertical={false} />
              <XAxis dataKey="dateLabel" stroke="var(--muted, #94a3b8)" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" stroke="#34d399" tick={{ fontSize: 11 }} domain={[20, 80]} unit="ms" />
              <YAxis yAxisId="right" orientation="right" stroke="#818cf8" tick={{ fontSize: 11 }} domain={[4, 9]} unit="h" />
              <Tooltip contentStyle={{ background: 'var(--surface, #1e293b)', border: '1px solid var(--line, #334155)', borderRadius: 6, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
              <Line yAxisId="left" type="monotone" dataKey="hrv" name="Resting HRV (ms)" stroke="#34d399" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="sleep" name="Sleep Duration (h)" stroke="#818cf8" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="stress" name="Stress Index (/5)" stroke="#fb7185" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {metricTab === 'cognitive' && (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--line, rgba(255,255,255,0.08))" vertical={false} />
              <XAxis dataKey="dateLabel" stroke="var(--muted, #94a3b8)" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" stroke="#fbbf24" tick={{ fontSize: 11 }} domain={[180, 320]} unit="ms" />
              <YAxis yAxisId="right" orientation="right" stroke="#f43f5e" tick={{ fontSize: 11 }} domain={[0, 100]} unit="mSv" />
              <Tooltip contentStyle={{ background: 'var(--surface, #1e293b)', border: '1px solid var(--line, #334155)', borderRadius: 6, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
              <Line yAxisId="left" type="monotone" dataKey="pvtRT" name="PVT Reaction Time (ms)" stroke="#fbbf24" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="dose" name="Cumulative Dose (mSv)" stroke="#f43f5e" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="immune" name="Immune Risk (%)" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {beginner && (
        <details style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--muted, #94a3b8)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 500 }}>Why multi-day trends matter</summary>
          <p style={{ marginTop: '6px', lineHeight: '1.4' }}>
            A single day’s high heart rate or missed exercise session is normal. What puts deep-space astronauts at risk is slow drift over weeks: bone demineralization, gradual drop in heart rate variability, or a multi-day creeping sleep debt that slows your brain’s reaction speed.
          </p>
        </details>
      )}
    </section>
  );
}
