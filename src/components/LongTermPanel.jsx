import VitalCard from './VitalCard.jsx';
import { LT_KEYS, LT_LIMITS, LT_META } from '../lib/longterm.js';

// Risks that build over weeks. The card text comes from INDICATORS in education.js.
export default function LongTermPanel({ metrics, beginner }) {
  return (
    <section aria-label="Slow changes over the mission">
      <h2 className="section-title">Slow changes over the mission</h2>
      <div className="vitals">
        {LT_KEYS.map((k) => {
          const m = metrics[k];
          const eta = m.eta == null ? null : `At today’s pace the next limit is about ${m.eta} ${m.eta === 1 ? 'day' : 'days'} away.`;
          return (
            <VitalCard
              key={k} id={k} raw={m.v} display={m.v.toFixed(LT_META[k].dec)} level={m.level}
              spec={{ min: 0, max: LT_LIMITS[k][2] * 1.35, hi: LT_LIMITS[k] }} beginner={beginner} extra={eta}
            />
          );
        })}
      </div>
      <p className="note">These change over weeks, so watch the pace more than one day. Values are simulated from your exercise, sleep, fluids and mood check-ins.</p>
    </section>
  );
}
