import StatusPill from './StatusPill.jsx';

export default function ImmunePanel({ immuneData, beginner }) {
  if (!immuneData) return null;
  const { score, level, statusLabel, viralReactivation, advice, components } = immuneData;

  const reactivationColor =
    viralReactivation === 'High' ? 'var(--red, #f43f5e)' :
    viralReactivation === 'Elevated' ? 'var(--orange, #fb923c)' :
    viralReactivation === 'Moderate' ? 'var(--yellow, #fbbf24)' :
    'var(--green, #34d399)';

  return (
    <section className="panel" aria-label="Immune and cellular defense">
      <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Immune & Cellular Defense</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--muted, #94a3b8)' }}>
            Grounded in NASA HRP research on deep-space leukocyte dysregulation and viral shedding.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusPill level={level} label={statusLabel} />
          <span className="mono" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{score}%</span>
        </div>
      </div>

      <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted, #94a3b8)', letterSpacing: '0.05em' }}>Latent Viral Reactivation Risk</span>
          <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: reactivationColor, display: 'inline-block' }} />
            <b style={{ fontSize: '1.05rem', color: reactivationColor }}>{viralReactivation} Risk</b>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: 'var(--muted, #94a3b8)' }}>
            EBV, VZV (shingles), and HSV reactivation likelihood.
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted, #94a3b8)', letterSpacing: '0.05em' }}>Primary Stressors</span>
          <div style={{ marginTop: '6px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Radiation exposure:</span>
              <span className="mono">{components.radiation} pts</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Circadian / Sleep debt:</span>
              <span className="mono">{components.circadianSleep} pts</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Psychosocial stress:</span>
              <span className="mono">{components.stress} pts</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Microgravity / Clinical signs:</span>
              <span className="mono">{components.microgravity + components.clinicalSymptoms} pts</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '14px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '8px', padding: '12px', borderLeft: '4px solid #38bdf8' }}>
        <b style={{ fontSize: '0.85rem', color: '#38bdf8' }}>Operational Countermeasure Guidance:</b>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', lineHeight: '1.4' }}>{advice}</p>
      </div>

      {beginner && (
        <details style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--muted, #94a3b8)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 500 }}>Why this matters on deep-space missions</summary>
          <p style={{ marginTop: '6px', lineHeight: '1.4' }}>
            In long-duration spaceflight, space radiation, altered gravity, and confinement weaken the body’s white blood cells and T-cell response. Dormant viruses carried by most humans (like Epstein-Barr virus) can wake up, causing skin rashes, cold sores, or immune fatigue. Tracking this helps you take action before symptoms become debilitating.
          </p>
        </details>
      )}
    </section>
  );
}
