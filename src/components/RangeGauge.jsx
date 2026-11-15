import { LEVELS } from '../lib/constants.js';

const fmt = (v) => (Math.abs(v) >= 100 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1));

/**
 * A bar split into coloured zones (green inside the usual range, then yellow, orange, red)
 * with a marker for the current value, so the status reads at a glance.
 */
export default function RangeGauge({ spec, value, level, unit }) {
  if (!spec) return null;
  const { min, max, lo = [], hi = [] } = spec;
  const span = max - min;
  const pct = (v) => Math.max(0, Math.min(100, ((v - min) / span) * 100));
  const segs = [];
  if (lo.length) segs.push([min, lo[2], 3], [lo[2], lo[1], 2], [lo[1], lo[0], 1]);
  segs.push([lo.length ? lo[0] : min, hi.length ? hi[0] : max, 0]);
  if (hi.length) segs.push([hi[0], hi[1], 1], [hi[1], hi[2], 2], [hi[2], max, 3]);
  const has = value != null;
  const label = has
    ? `${fmt(value)} ${unit}, ${LEVELS[level]}. Usual range ${fmt(lo.length ? lo[0] : min)} to ${fmt(hi.length ? hi[0] : max)}.`
    : 'No reading';
  return (
    <div className="gauge" role="img" aria-label={label}>
      <div className="gauge-bar">
        {segs.map(([a, b, l]) => (
          <span key={`${a}-${l}`} className={`zone zone-${l}`} style={{ left: `${pct(a)}%`, width: `${Math.max(0, pct(b) - pct(a))}%` }} />
        ))}
        {has && <span className="mark" data-lv={level} style={{ left: `${pct(value)}%` }} />}
      </div>
      <div className="gauge-scale mono">
        <span>{fmt(min)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  );
}
