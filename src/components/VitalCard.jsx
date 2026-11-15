import StatusPill from './StatusPill.jsx';
import RangeGauge from './RangeGauge.jsx';
import { INDICATORS, STATUS_TEXT } from '../lib/education.js';

/**
 * One health indicator: value, colour-coded status, range gauge, a one-line meaning,
 * and an expandable explanation for people who are not medical experts.
 * raw is the number for the gauge (null when there is no signal); display is the text shown.
 */
export default function VitalCard({ id, raw, display, level, spec, beginner, extra = null, baseline = null }) {
  const info = INDICATORS[id];
  const lv = raw == null ? 'n' : level;
  return (
    <article className="vital" data-lv={lv}>
      <header>
        <h3 className="k">{info.name}</h3>
        <StatusPill level={lv} />
      </header>
      <p className="val mono">
        {display}
        <small>{info.unit}</small>
      </p>
      <RangeGauge spec={spec} value={raw} level={level} unit={info.unit} />
      {baseline && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--muted, #94a3b8)', marginTop: '4px' }}>
          <span>Your norm: <b className="mono" style={{ color: 'var(--text, #e2e8f0)' }}>{baseline.mean} {info.unit}</b></span>
          {baseline.z != null && (
            <span className="mono" style={{ color: baseline.isAnomaly ? 'var(--orange, #fb923c)' : 'var(--muted, #94a3b8)', fontWeight: baseline.isAnomaly ? 600 : 400 }}>
              {baseline.z > 0 ? `+${baseline.z}σ` : `${baseline.z}σ`}{baseline.isAnomaly ? ' shift' : ''}
            </span>
          )}
        </div>
      )}
      <p className="mean">{raw == null ? 'No signal. Check your sensor patch.' : STATUS_TEXT[level]}</p>
      {extra && <p className="note">{extra}</p>}
      <details key={String(beginner)} open={beginner}>
        <summary>What is this?</summary>
        <dl className="explain">
          <dt>What it is</dt>
          <dd>{info.what}</dd>
          <dt>Usual range</dt>
          <dd>{info.normal}</dd>
          <dt>Why it matters here</dt>
          <dd>{info.why}</dd>
          <dt>If it is flagged</dt>
          <dd>{info.ifFlagged}</dd>
        </dl>
      </details>
    </article>
  );
}
