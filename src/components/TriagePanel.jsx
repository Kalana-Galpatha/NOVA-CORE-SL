import { useState } from 'react';
import StatusPill from './StatusPill.jsx';
import { SYMPTOMS, triage } from '../lib/triage.js';

const CALL = ['Self-care', 'Monitor and log', 'Tell the medical officer today', 'Contact the flight surgeon now'];

export default function TriagePanel({ ctx, profile }) {
  const [id, setId] = useState(null);
  const [dispatched, setDispatched] = useState(null);
  const sym = SYMPTOMS.find((s) => s.id === id);
  const r = sym && triage(sym, ctx);

  const handleDispatch = () => {
    if (profile?.autonomous) {
      setDispatched({
        type: 'delayed',
        text: `Telemetry packet transmitted to Mission Control (Houston). Speed-of-light delay: ${profile.commsLabel}. Astronaut and Crew Medical Officer are cleared for immediate autonomous action.`,
      });
    } else {
      setDispatched({
        type: 'direct',
        text: `Direct real-time link established with Houston Flight Surgeon.`,
      });
    }
  };

  return (
    <section className="panel" aria-label="Symptom helper">
      <header>
        <h2>Symptom helper</h2>
        <p>
          {profile?.autonomous ? `Autonomous Mode · ${profile.commsLabel}` : 'Works offline when messages are delayed'}
        </p>
      </header>
      <div className="grp" role="group" aria-label="Choose what you feel">
        {SYMPTOMS.map((s) => (
          <button key={s.id} type="button" className="btn sm" aria-pressed={id === s.id} onClick={() => { setId(s.id); setDispatched(null); }}>
            {s.label}
          </button>
        ))}
      </div>
      {sym && (
        <div className="triage" data-lv={r.level} aria-live="polite">
          <StatusPill level={r.level} label={CALL[r.level]} />
          {r.note && <p className="msg">{r.note}</p>}
          <p><b>Likely causes.</b> {sym.causes}</p>
          <ol className="steps">{sym.steps.map((t) => <li key={t}>{t}</li>)}</ol>
          <p><b>Call sooner if.</b> {sym.call}</p>

          <div style={{ marginTop: '12px', borderTop: '1px solid var(--line, rgba(255,255,255,0.1))', paddingTop: '10px' }}>
            <button type="button" className="btn sm" onClick={handleDispatch}>
              {profile?.autonomous ? 'Transmit Telemetry Packet to Earth' : 'Contact Ground Flight Surgeon'}
            </button>
            {dispatched && (
              <div style={{ marginTop: '8px', padding: '8px 10px', borderRadius: '6px', fontSize: '0.82rem', background: dispatched.type === 'delayed' ? 'rgba(251, 146, 60, 0.12)' : 'rgba(52, 211, 153, 0.12)', borderLeft: `3px solid ${dispatched.type === 'delayed' ? '#fb923c' : '#34d399'}` }}>
                {dispatched.text}
              </div>
            )}
          </div>
        </div>
      )}
      <p className="note">Guidance only. It does not diagnose and does not replace the flight surgeon.</p>
    </section>
  );
}
