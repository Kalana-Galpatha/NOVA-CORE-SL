import { REFERENCE_DOSE, EXERCISE_OK } from './constants.js';
import { co2Level } from './status.js';

const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;

/**
 * Short, plain-language observations for one crew member in one environment.
 * Each insight is { id, level, title, text } where level is 0 to 3.
 */
export function buildInsights({ snap, crewId, profile, alerts }) {
  const c = snap.crew.find((x) => x.id === crewId);
  const out = [];
  if (!c) return out;

  const mine = alerts.filter((a) => a.crew === crewId || a.crew === null);
  if (mine.length) {
    const worst = mine.reduce((m, a) => Math.max(m, a.level), 0);
    out.push({
      id: 'alerts', level: worst,
      title: `${mine.length} active ${mine.length === 1 ? 'alert' : 'alerts'}`,
      text: 'Open the alert list for what each one means and the suggested step.',
    });
  } else {
    out.push({ id: 'alerts', level: 0, title: 'No active alerts', text: 'Your readings and the cabin air are inside their limits.' });
  }

  const pct = (c.dose / REFERENCE_DOSE) * 100;
  out.push({
    id: 'dose', level: pct > 50 ? 1 : 0,
    title: 'Radiation so far',
    text: `You have collected ${c.dose.toFixed(1)} mSv this mission. That is ${pct.toFixed(0)} percent of the ${REFERENCE_DOSE} mSv reference. Shelter in solar storms to keep it low.`,
  });

  const target = snap.exTarget;
  const lowG = profile.gravity === 0
    ? 'In microgravity your bones and muscles weaken without it.'
    : `With ${profile.gravityLabel.toLowerCase()} your body gets less load than on Earth, so exercise still matters.`;
  const behind = c.ex < EXERCISE_OK * target;
  out.push({
    id: 'exercise', level: behind && snap.hour >= 17 ? 1 : 0,
    title: 'Exercise today',
    text: `${c.ex} of ${target} minutes done. ${lowG}`,
  });

  if (c.act !== 'sleep') {
    out.push({
      id: 'sleep', level: c.sleep < 6 ? 1 : 0,
      title: 'Last night’s sleep',
      text: `You slept ${c.sleep.toFixed(1)} hours. Most adults do best with 7 to 8.`,
    });
  }

  const hr = c.hist.hr.filter((v) => v != null);
  if (c.act === 'work' && hr.length >= 40) {
    const recent = avg(hr.slice(-10));
    const before = avg(hr.slice(-40, -10));
    if (recent - before > 8) {
      out.push({
        id: 'hr-trend', level: 1,
        title: 'Heart rate is trending up',
        text: `Your heart rate is about ${Math.round(recent - before)} bpm higher than half an hour ago while you are on duty. Check hydration, cabin CO₂ and stress.`,
      });
    }
  }

  const co2 = snap.env.co2;
  if (co2 > 3.6 && co2Level(co2) === 0) {
    out.push({
      id: 'co2-creep', level: 1,
      title: 'Cabin CO₂ is creeping up',
      text: `It is ${co2.toFixed(1)} mmHg. A stuffy room and a mild headache are early signs of higher CO₂. Check airflow.`,
    });
  }

  const longM = snap.long?.[crewId];
  if (longM?.sleep?.v >= 6 && longM?.stress?.v >= 3.5) {
    out.push({
      id: 'fatigue-risk', level: 2,
      title: 'Operational Fatigue & Cognitive Risk',
      text: `Accumulated sleep debt (${longM.sleep.text}) and elevated stress (${longM.stress.text}) increase attentional lapse probability. Take the PVT alertness check before EVA or manual docking.`,
    });
  }

  out.push({ id: 'tip', level: 0, title: profile.tipTitle, text: profile.tip });
  return out;
}
