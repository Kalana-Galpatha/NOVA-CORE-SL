import { LIMITS } from './constants.js';

// Level from 0 (nominal) to 3 (warning). Limits are ordered watch, caution, warning.
const high = (v, t) => t.reduce((l, x, i) => (v > x ? i + 1 : l), 0);
const low = (v, t) => t.reduce((l, x, i) => (v < x ? i + 1 : l), 0);

// Heart rate limits depend on what the person is doing.
export function hrLimits(act, max) {
  return {
    hi: act === 'exercise' ? LIMITS.hrExercise.map((f) => f * max) : act === 'sleep' ? LIMITS.hrSleep.hi : LIMITS.hrWork.hi,
    lo: act === 'sleep' ? LIMITS.hrSleep.lo : LIMITS.hrWork.lo,
  };
}

export function hrLevel(v, act, max) {
  const { hi, lo } = hrLimits(act, max);
  const h = high(v, hi);
  const l = low(v, lo);
  return { level: Math.max(h, l), dir: h >= l ? 'high' : 'low' };
}

export const spo2Level = (v) => low(v, LIMITS.spo2);
export const tempLevel = (v) => high(v, LIMITS.temp);
export const respLevel = (v) => high(v, LIMITS.resp);
export const sysLevel = (v) => high(v, LIMITS.sys);
export const hrvLevel = (v) => low(v, LIMITS.hrv);
export const co2Level = (v) => high(v, LIMITS.co2);
export const pressureLevel = (v) => low(v, LIMITS.pressure);
export const ppo2Level = (v) => low(v, LIMITS.ppo2);
export const doseLevel = (v) => high(v, LIMITS.dose);

// Gauge scale for one indicator: display range plus the low and high edges.
export function gaugeFor(measure, crew) {
  switch (measure) {
    case 'hr': {
      const { hi, lo } = hrLimits(crew.act, crew.max);
      return { min: 25, max: Math.max(170, Math.ceil(hi[2] + 10)), lo, hi };
    }
    case 'spo2': return { min: 85, max: 100, lo: LIMITS.spo2 };
    case 'temp': return { min: 35.5, max: 40, hi: LIMITS.temp };
    case 'resp': return { min: 6, max: 34, hi: LIMITS.resp };
    case 'sys': return { min: 90, max: 180, hi: LIMITS.sys };
    case 'hrv': return { min: 10, max: 100, lo: LIMITS.hrv };
    case 'co2': return { min: 2, max: 9, hi: LIMITS.co2 };
    case 'pressure': return { min: 88, max: 103, lo: LIMITS.pressure };
    case 'ppo2': return { min: 16, max: 22, lo: LIMITS.ppo2 };
    case 'dose': return { min: 0, max: 1200, hi: LIMITS.dose };
    default: return null;
  }
}
