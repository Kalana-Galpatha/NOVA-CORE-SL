import { ACTIVITY_LABEL, EXERCISE_OK, LIMITS } from './constants.js';
import {
  hrLevel, spo2Level, tempLevel, respLevel, sysLevel, hrvLevel,
  co2Level, pressureLevel, ppo2Level, doseLevel,
} from './status.js';
import { LT_META } from './longterm.js';

const n0 = (v) => Math.round(v);
const n1 = (v) => v.toFixed(1);

/**
 * Pure function: look at one snapshot and return the level every rule wants right now.
 * Persistence (3 readings to raise, 5 to clear) is handled by AlertEngine below.
 */
export function evaluateRules(s) {
  const out = [];
  const exTarget = s.exTarget ?? 120;
  for (const c of s.crew) {
    for (const [k, m] of Object.entries(s.long?.[c.id] ?? {})) {
      if (m.level) out.push({ key: `lt:${k}:${c.id}`, crew: c.id, subject: c.name, level: m.level, title: LT_META[k].title, detail: m.text, adv: `lt_${k}` });
    }
    if (c.lost) {
      if (c.lostTicks >= 1) {
        out.push({ key: `sig:${c.id}`, crew: c.id, subject: c.name, level: 2, title: 'Sensor signal lost', detail: `No data for ${c.lostTicks} min`, adv: 'sig' });
      }
      continue; // never judge health from stale values
    }
    const v = c.v;
    const hr = hrLevel(v.hr, c.act, c.max);
    if (hr.level) {
      out.push({ key: `hr:${c.id}`, crew: c.id, subject: c.name, level: hr.level, title: hr.dir === 'high' ? 'Heart rate high' : 'Heart rate low', detail: `${n0(v.hr)} bpm, ${ACTIVITY_LABEL[c.act].toLowerCase()}`, adv: 'hr' });
    }
    let l = spo2Level(v.spo2);
    if (l) out.push({ key: `spo2:${c.id}`, crew: c.id, subject: c.name, level: l, title: 'Blood oxygen low', detail: `${n1(v.spo2)} % SpO₂`, adv: 'spo2' });
    l = tempLevel(v.temp);
    if (l) out.push({ key: `temp:${c.id}`, crew: c.id, subject: c.name, level: l, title: 'Core temperature high', detail: `${n1(v.temp)} °C`, adv: 'temp' });
    if (c.act !== 'exercise') {
      l = respLevel(v.resp);
      if (l) out.push({ key: `resp:${c.id}`, crew: c.id, subject: c.name, level: l, title: 'Breathing fast', detail: `${n0(v.resp)} breaths/min`, adv: 'resp' });
      l = sysLevel(v.sys);
      if (l) out.push({ key: `sys:${c.id}`, crew: c.id, subject: c.name, level: l, title: 'Systolic pressure high', detail: `${n0(v.sys)} mmHg`, adv: 'sys' });
      if (v.hrv != null) {
        l = hrvLevel(v.hrv);
        if (l) out.push({ key: `hrv:${c.id}`, crew: c.id, subject: c.name, level: l, title: 'Heart rate variability low', detail: `${n0(v.hrv)} ms RMSSD (autonomic strain)`, adv: 'hrv' });
      }
    }
    if (c.fx?.arrhythmia) {
      out.push({ key: `arrhythmia:${c.id}`, crew: c.id, subject: c.name, level: 2, title: 'Cardiac arrhythmia detected', detail: 'Irregular ventricular rhythm (PVC)', adv: 'arrhythmia' });
    }
    if (s.hour >= 20 && c.ex < EXERCISE_OK * exTarget) {
      out.push({ key: `ex:${c.id}`, crew: c.id, subject: c.name, level: 1, title: 'Exercise behind target', detail: `${c.ex} of ${exTarget} min today`, adv: 'ex' });
    }
  }
  const e = s.env;
  const ppo2 = e.ppo2 ?? e.pressure * 0.209;
  let l = co2Level(e.co2);
  if (l) out.push({ key: 'co2', crew: null, subject: 'Cabin', level: l, title: 'Cabin CO₂ high', detail: `${n1(e.co2)} mmHg`, adv: 'co2' });
  else {
    // NASA-STD-3001 [V2 6004]: average one-hour ppCO2 must stay at or under 3 mmHg.
    const h = (e.hist?.co2 ?? []).filter((x) => x != null).slice(-60);
    const avg = h.length >= 30 ? h.reduce((a, b) => a + b, 0) / h.length : null;
    if (avg != null && avg > LIMITS.co2Avg1h) {
      out.push({ key: 'co2', crew: null, subject: 'Cabin', level: 1, title: 'Cabin CO₂ above NASA one-hour limit', detail: `${n1(avg)} mmHg one-hour average (limit ${LIMITS.co2Avg1h})`, adv: 'co2' });
    }
  }
  l = pressureLevel(e.pressure);
  if (l) out.push({ key: 'press', crew: null, subject: 'Cabin', level: l, title: 'Cabin pressure low', detail: `${n1(e.pressure)} kPa`, adv: 'press' });
  l = ppo2Level(ppo2);
  if (l) out.push({ key: 'ppo2', crew: null, subject: 'Cabin', level: l, title: 'Oxygen partial pressure low', detail: `${n1(ppo2)} kPa ppO₂`, adv: 'ppo2' });
  l = doseLevel(e.dose);
  if (l) out.push({ key: 'rad', crew: null, subject: 'Radiation', level: l, title: 'Radiation rate elevated', detail: `${n0(e.dose)} µSv/h${e.shelter ? ', crew sheltering' : ''}`, adv: 'rad' });
  return out;
}

const RAISE_AFTER = 3; // consecutive readings outside a limit
const ESCALATE_AFTER = 2; // consecutive readings at a higher level
const CLEAR_AFTER = 5; // consecutive readings back inside

export class AlertEngine {
  constructor() {
    this.active = new Map();
    this.pending = new Map();
    this.entries = [];
    this.seq = 0;
  }

  record(t, kind, a, level = a.level) {
    this.entries.unshift({ t, kind, level, subject: a.subject, title: a.title, detail: a.detail });
    if (this.entries.length > 200) this.entries.pop();
  }

  note(t, subject, title) {
    this.record(t, 'Scenario', { subject, title, detail: '' }, 'n');
  }

  update(snapshot) {
    const t = snapshot.t;
    const wanted = new Map();
    evaluateRules(snapshot).forEach((r) => wanted.set(r.key, r));

    wanted.forEach((r, key) => {
      const cur = this.active.get(key);
      const p = this.pending.get(key) || { up: 0, down: 0 };
      if (!cur) {
        p.up += 1; p.down = 0;
        if (p.up >= RAISE_AFTER) {
          this.active.set(key, { ...r, since: t, ack: false, id: ++this.seq });
          this.record(t, 'Raised', r);
          this.pending.delete(key);
          return;
        }
      } else if (r.level > cur.level) {
        p.up += 1; p.down = 0;
        if (p.up >= ESCALATE_AFTER) {
          Object.assign(cur, { level: r.level, ack: false, title: r.title, detail: r.detail });
          this.record(t, 'Escalated', cur);
          this.pending.delete(key);
          return;
        }
      } else if (r.level < cur.level) {
        p.down += 1; p.up = 0;
        if (p.down >= CLEAR_AFTER) {
          Object.assign(cur, { level: r.level, title: r.title, detail: r.detail });
          this.record(t, 'Eased', cur);
          this.pending.delete(key);
          return;
        }
      } else {
        p.up = 0; p.down = 0;
        cur.detail = r.detail;
      }
      this.pending.set(key, p);
    });

    this.active.forEach((cur, key) => {
      if (wanted.has(key)) return;
      const p = this.pending.get(key) || { up: 0, down: 0 };
      p.down += 1; p.up = 0;
      if (p.down >= CLEAR_AFTER) {
        this.active.delete(key);
        this.pending.delete(key);
        this.record(t, 'Cleared', { ...cur, detail: 'Back inside limits' }, 0);
      } else {
        this.pending.set(key, p);
      }
    });

    this.pending.forEach((_, key) => {
      if (!wanted.has(key) && !this.active.has(key)) this.pending.delete(key);
    });
  }

  acknowledge(key) {
    const a = this.active.get(key);
    if (a) a.ack = true;
  }

  takeAction(key, actionText, retestMinutes = 30) {
    const a = this.active.get(key);
    if (a) {
      a.ack = true;
      a.action = {
        text: actionText,
        at: a.since,
        retestMinutes,
      };
      this.record(a.since, 'Action', { subject: a.subject, title: actionText, detail: `Re-evaluating in ${retestMinutes}m` }, a.level);
    }
  }

  alerts() {
    return [...this.active.values()].map((a) => ({ ...a })).sort((a, b) => b.level - a.level || b.since - a.since);
  }

  log() {
    return this.entries.slice(0, 200).map((e) => ({ ...e }));
  }
}
