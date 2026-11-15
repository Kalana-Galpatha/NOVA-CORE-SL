import { REFERENCE_DOSE } from './constants.js';
import { calculateImmuneRisk } from './immune.js';

// Slow risks that build over weeks. Rates are illustrative per-day values in full
// microgravity, scaled by the place's gravity and by how well exercise is kept up.
// Replace them with the mission's medical data before any real use.
export const LT_LIMITS = {
  bone: [2, 4, 6], muscle: [8, 15, 20], vision: [0.5, 1, 1.5],
  hydration: [1, 2, 3], sleep: [4, 8, 14], stress: [3.5, 4, 4.5], cumdose: [50, 75, 100],
  immune: [25, 50, 75],
};
export const LT_KEYS = Object.keys(LT_LIMITS);
export const LT_META = {
  bone: { title: 'Bone density loss', unit: '%', dec: 2 },
  muscle: { title: 'Muscle loss', unit: '%', dec: 1 },
  vision: { title: 'Near-vision shift', unit: 'D', dec: 2 },
  hydration: { title: 'Low fluid intake', unit: 'days', dec: 0 },
  sleep: { title: 'Sleep debt', unit: 'h', dec: 1 },
  stress: { title: 'Stress building', unit: '/5', dec: 1 },
  cumdose: { title: 'Mission radiation dose', unit: '% of reference', dec: 0 },
  immune: { title: 'Immune dysregulation', unit: '%', dec: 0 },
};
const DAY = 1440; // ticks per day
const levelOf = (v, t) => t.reduce((l, x, i) => (v > x ? i + 1 : l), 0);

// Change per day for the metrics that follow a model. g is 1 minus the place's gravity.
export function dailyRates(g, adherence, vision) {
  return {
    bone: 0.04 * g * (1 - 0.6 * adherence),
    muscle: 0.3 * g * (1 - 0.7 * adherence),
    vision: (0.8 * g - vision) / 60,
  };
}

export class LongTerm {
  constructor({ crewIds, profile, tasks }) {
    this.tasks = tasks;
    this.g = 1 - profile.gravity;
    this.day = null;
    this.s = {};
    crewIds.forEach((id, i) => {
      const f = 0.9 + 0.07 * i; // crew differ a little
      this.s[id] = {
        bone: 0.98 * this.g * f, muscle: 6.2 * this.g * f, vision: 0.43 * this.g * f,
        lowDays: 0, debt: 1.5 * f, stress: 2 + 0.1 * i,
        adh: 0.8, exMax: 0, hyd: false, mood: null, prevAct: 'work', dose: 0, doseRate: 0,
        immune: 12 + 2 * i, immuneRating: 0, immuneData: null,
      };
    });
  }

  /** Call after tasks.update on every tick. */
  update(snap) {
    const day = Math.floor(snap.t / 86400);
    const newDay = this.day !== null && day !== this.day;
    this.day = day;
    for (const c of snap.crew) {
      const s = this.s[c.id];
      const done = this.tasks.p[c.id].done;
      s.exMax = Math.max(s.exMax, c.ex);
      if (done.hydration) s.hyd = true;
      if (done.mood?.reading) s.mood = done.mood.reading.rating;
      if (done.immune_check?.reading) s.immuneRating = done.immune_check.reading.rating;
      if (s.prevAct === 'sleep' && c.act !== 'sleep') {
        // short sleep plus a stuffy cabin both add to the debt
        s.debt += Math.max(0, 7.5 - c.sleep) + Math.max(0, snap.env.co2 - 3.8) * 0.8;
      }
      s.prevAct = c.act;
      const r = dailyRates(this.g, s.adh, s.vision);
      s.bone += r.bone / DAY;
      s.muscle += r.muscle / DAY;
      s.vision += r.vision / DAY;
      s.dose = c.dose;
      s.doseRate = ((snap.env.dose * 24) / 1000 / REFERENCE_DOSE) * 100; // percent of reference per day

      // Compute dynamic immune dysregulation
      const immuneCalc = calculateImmuneRisk({
        cumDose: c.dose,
        refDose: REFERENCE_DOSE,
        sleepDebt: s.debt,
        stressLevel: s.stress,
        symptomRating: s.immuneRating ?? 0,
        fever: Boolean(c.fx?.fever || c.v?.temp > 37.8),
        gravity: 1 - this.g,
      });
      s.immune = immuneCalc.score;
      s.immuneData = immuneCalc;

      if (newDay) {
        s.adh = Math.min(1, s.exMax / snap.exTarget);
        s.exMax = 0;
        s.lowDays = s.hyd ? 0 : s.lowDays + 1;
        s.hyd = false;
        s.debt = Math.max(0, s.debt - 0.5);
        if (s.mood) s.stress = 0.7 * s.stress + 0.3 * s.mood;
        s.mood = null;
      }
    }
  }

  // { key: { v, level, text, eta, meta } } for one crew member. eta is days to the next limit at today's pace.
  metrics(id) {
    const s = this.s[id];
    const rates = { ...dailyRates(this.g, s.adh, s.vision), cumdose: s.doseRate, immune: 0.8 };
    const value = {
      bone: s.bone, muscle: s.muscle, vision: s.vision, hydration: s.lowDays,
      sleep: s.debt, stress: s.stress, cumdose: (s.dose / REFERENCE_DOSE) * 100,
      immune: s.immune,
    };
    const out = {};
    for (const k of LT_KEYS) {
      const v = value[k];
      const next = LT_LIMITS[k].find((x) => x > v);
      const m = LT_META[k];
      out[k] = {
        v, level: levelOf(v, LT_LIMITS[k]), text: `${v.toFixed(m.dec)} ${m.unit}`,
        eta: next !== undefined && rates[k] > 1e-6 ? Math.ceil((next - v) / rates[k]) : null,
        data: k === 'immune' ? s.immuneData : null,
      };
    }
    return out;
  }

  snapshot() {
    return Object.fromEntries(Object.keys(this.s).map((id) => [id, this.metrics(id)]));
  }
}
