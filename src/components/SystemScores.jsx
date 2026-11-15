import StatusPill from './StatusPill.jsx';
import { num } from '../lib/format.js';
import { hrLevel, sysLevel, hrvLevel, co2Level, pressureLevel, doseLevel } from '../lib/status.js';

export default function SystemScores({ crew, env, long, alerts = [] }) {
  if (!crew || !long) return null;

  // 1. Cardiovascular
  const hrLv = hrLevel(crew.v.hr, crew.act, crew.max).level;
  const sysLv = sysLevel(crew.v.sys);
  const hrvLv = crew.v.hrv != null ? hrvLevel(crew.v.hrv) : 0;
  const rhythmAlert = alerts.some((a) => a.key === `arrhythmia:${crew.id}`);
  const cardioLevel = Math.max(hrLv, sysLv, hrvLv, rhythmAlert ? 2 : 0);

  // 2. Musculoskeletal
  const boneLv = long.bone?.level ?? 0;
  const muscleLv = long.muscle?.level ?? 0;
  const musculoLevel = Math.max(boneLv, muscleLv);

  // 3. Neurobehavioral
  const sleepLv = long.sleep?.level ?? 0;
  const stressLv = long.stress?.level ?? 0;
  const neuroLevel = Math.max(sleepLv, stressLv);

  // 4. Immune & Barrier
  const immuneLv = long.immune?.level ?? 0;
  const immuneLevel = immuneLv;

  // 5. Sensory & Vision (SANS)
  const visionLv = long.vision?.level ?? 0;
  const visionLevel = visionLv;

  // 6. Environmental Habitat
  const co2Lv = co2Level(env.co2);
  const pressLv = pressureLevel(env.pressure);
  const radLv = doseLevel(env.dose);
  const envLevel = Math.max(co2Lv, pressLv, radLv);

  const systems = [
    {
      id: 'cardio',
      name: 'Cardiovascular',
      level: cardioLevel,
      metric: `${num(crew.v.hr)} bpm · BP ${num(crew.v.sys)} · HRV ${num(crew.v.hrv)} ms`,
      desc: rhythmAlert ? 'Arrhythmia / irregular rhythm noted' : cardioLevel === 0 ? 'Autonomic balance & hemodynamics nominal' : 'Cardiovascular drift or strain detected',
    },
    {
      id: 'musculo',
      name: 'Musculoskeletal',
      level: musculoLevel,
      metric: `Bone -${long.bone.v.toFixed(2)}% · Muscle -${long.muscle.v.toFixed(1)}%`,
      desc: musculoLevel === 0 ? 'Structural loading & bone density preserved' : 'Microgravity bone demineralization pacing',
    },
    {
      id: 'neuro',
      name: 'Neurobehavioral',
      level: neuroLevel,
      metric: `Debt ${long.sleep.v.toFixed(1)}h · Stress ${long.stress.v.toFixed(1)}/5`,
      desc: neuroLevel === 0 ? 'Circadian stability & mood optimal' : 'Elevated fatigue or stress building',
    },
    {
      id: 'immune',
      name: 'Immune & Barrier',
      level: immuneLevel,
      metric: `Risk ${long.immune.v.toFixed(0)}% · ${long.immune.data?.viralReactivation ?? 'Low'} Viral Risk`,
      desc: immuneLevel === 0 ? 'Cellular defense & leukocyte activity nominal' : 'Immune suppression / reactivation alert',
    },
    {
      id: 'vision',
      name: 'Sensory & Vision (SANS)',
      level: visionLevel,
      metric: `Near-shift +${long.vision.v.toFixed(2)} D`,
      desc: visionLevel === 0 ? 'Ocular pressure & visual acuity stable' : 'Cephalad fluid shift pressing on retina',
    },
    {
      id: 'env',
      name: 'Habitat Environment',
      level: envLevel,
      metric: `CO₂ ${num(env.co2, 1)} mmHg · ${num(env.dose)} µSv/h`,
      desc: envLevel === 0 ? 'Atmosphere, pressure & radiation within limits' : 'Cabin air or radiation alert active',
    },
  ];

  return (
    <section aria-label="Body systems overview" style={{ margin: '8px 0 16px 0' }}>
      <h2 className="section-title">Body Systems Overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
        {systems.map((s) => (
          <div
            key={s.id}
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px',
              padding: '12px 14px',
              border: '1px solid rgba(255,255,255,0.08)',
              borderLeft: `4px solid ${
                s.level === 3 ? 'var(--red, #f43f5e)' :
                s.level === 2 ? 'var(--orange, #fb923c)' :
                s.level === 1 ? 'var(--yellow, #fbbf24)' :
                'var(--green, #34d399)'
              }`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: '0.95rem' }}>{s.name}</b>
              <StatusPill level={s.level} />
            </div>
            <div className="mono" style={{ fontSize: '0.82rem', color: 'var(--accent, #38bdf8)', marginTop: '4px' }}>
              {s.metric}
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--muted, #94a3b8)', lineHeight: '1.3' }}>
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
