import { TICK_SECONDS as TICK, HISTORY as HN, MISSION_START } from './constants.js';

// Roughly bell-shaped noise
const noise = (a) => (Math.random() + Math.random() + Math.random() - 1.5) * a * 0.8;
const push = (arr, v) => {
  arr.push(v);
  if (arr.length > HN) arr.shift();
};

// How each activity shifts the resting values
const ACTIVITY = {
  sleep: { hr: -9, resp: -2, temp: -0.3, spo2: -0.4, sys: -8, hrv: 16 },
  work: { hr: 5, resp: 0, temp: 0, spo2: 0, sys: 2, hrv: 0 },
  exercise: { hr: 78, resp: 14, temp: 0.8, spo2: -0.6, sys: 38, hrv: -30 },
};

const CREW = [
  { id: 'okafor', name: 'Mira Okafor', role: 'Commander', age: 44, rest: 58, sys: 112, dia: 72, temp: 36.7, sleep: 7.1, dose: 86.2 },
  { id: 'reyes', name: 'Joaquin Reyes', role: 'Pilot', age: 41, rest: 64, sys: 118, dia: 76, temp: 36.8, sleep: 6.6, dose: 86.9 },
  { id: 'varga', name: 'Anika Varga', role: 'Flight Engineer', age: 38, rest: 61, sys: 110, dia: 70, temp: 36.9, sleep: 7.4, dose: 85.7 },
  { id: 'tanaka', name: 'Hiroshi Tanaka', role: 'Medical Officer', age: 47, rest: 66, sys: 122, dia: 78, temp: 36.7, sleep: 6.9, dose: 87.1 },
];

export class Simulator {
  /** @param profile one entry from ENVIRONMENTS */
  constructor(profile, startT = MISSION_START) {
    this.profile = profile;
    this.live = null; // real cabin readings {pressure, ppo2, co2}; overrides the simulated cabin while set
    this.t = startT - HN * TICK;
    this.lastDay = Math.floor(this.t / 86400);
    this.crew = CREW.map((c) => ({
      ...c,
      dose: (c.dose * profile.dose) / 75, // earlier mission stages scale with the place
      max: 220 - c.age,
      fx: { tachy: false, fever: false, arrhythmia: false },
      lost: false,
      lostTicks: 0,
      act: 'work',
      prevAct: 'work',
      ex: 0,
      v: { hr: c.rest + 5, spo2: 98.2, temp: c.temp, resp: 14, sys: c.sys, hrv: 58 },
      hist: { hr: [], spo2: [], temp: [] },
    }));
    this.env = {
      co2: profile.co2, pressure: profile.pressure, temp: profile.temp, hum: profile.hum, dose: profile.dose,
      scrub: false, leak: false, spe: null, shelter: false,
      hist: { co2: [], dose: [] },
    };
  }

  hour() {
    return (this.t / 3600) % 24;
  }

  // Sleep 22:00-06:00. Exercise two hours: 10:00 for even crew, 14:00 for odd.
  activity(i) {
    const h = this.hour();
    if (h >= 22 || h < 6) return 'sleep';
    const start = i % 2 === 0 ? 10 : 14;
    if (h >= start && h < start + 2) return 'exercise';
    return 'work';
  }

  warmUp() {
    for (let i = 0; i < HN; i++) this.tick();
  }

  tick() {
    this.t += TICK;
    const day = Math.floor(this.t / 86400);
    if (day !== this.lastDay) {
      this.lastDay = day;
      this.crew.forEach((c) => (c.ex = 0));
    }
    this.stepEnv();
    this.crew.forEach((c, i) => this.stepCrew(c, i));
  }

  stepEnv() {
    const e = this.env;
    const p = this.profile;
    e.co2 += e.scrub ? 0.14 + noise(0.03) : (p.co2 - e.co2) * 0.06 + noise(0.03);
    e.co2 = Math.max(2.5, Math.min(10.5, e.co2));
    e.pressure += e.leak ? -(0.28 + noise(0.03)) : (p.pressure - e.pressure) * 0.08 + noise(0.02);
    e.pressure = Math.max(84, Math.min(p.pressure + 0.3, e.pressure));
    e.temp += (p.temp - e.temp) * 0.05 + noise(0.03);
    e.hum += (p.hum - e.hum) * 0.05 + noise(0.2);

    // Solar particle event: ramp up 8 min, hold to minute 40, then decay
    let extra = 0;
    if (e.spe) {
      e.spe.t += 1;
      const s = e.spe.t;
      extra = e.spe.peak * (s < 8 ? s / 8 : s < 40 ? 1 : Math.exp(-(s - 40) / 25));
      if (s > 40 && extra < 5) e.spe = null;
    }
    e.dose = p.dose + noise(p.dose * 0.055) + extra * (1 + noise(0.05));
    if (!e.spe && e.dose < 150) e.shelter = false;
    const L = this.live;
    if (L) {
      if (L.co2 != null) e.co2 = L.co2;
      if (L.pressure != null) e.pressure = L.pressure;
    }
    e.ppo2Live = L?.ppo2 ?? null;
    push(e.hist.co2, e.co2);
    push(e.hist.dose, e.dose);
  }

  stepCrew(c, i) {
    const act = this.activity(i);
    c.prevAct = c.act;
    c.act = act;
    if (act === 'sleep' && c.prevAct !== 'sleep') c.sleep = 0;
    if (act === 'sleep') c.sleep += TICK / 3600;
    if (act === 'exercise') c.ex += 1;
    const shield = this.env.shelter ? this.profile.shelterFactor : 1;
    c.dose += (this.env.dose * shield) / 60 / 1000; // mSv per minute

    if (c.lost) {
      c.lostTicks += 1;
      push(c.hist.hr, null);
      push(c.hist.spo2, null);
      push(c.hist.temp, null);
      return;
    }
    c.lostTicks = 0;

    const A = ACTIVITY[act];
    const co2Excess = Math.max(0, this.env.co2 - 4);
    const lowPressure = Math.max(0, 92 - this.env.pressure);
    const target = {
      hr: c.rest + A.hr + (c.fx.tachy ? (act === 'sleep' ? 40 : 62) : 0) + (c.fx.fever ? 14 : 0) + (c.fx.arrhythmia ? 16 : 0) + co2Excess * 3.2,
      spo2: 98.2 + A.spo2 - (c.fx.fever ? 0.6 : 0) - lowPressure * 0.7,
      temp: c.temp + A.temp + (c.fx.fever ? 2 : 0),
      resp: 14 + A.resp + co2Excess * 1.4 + (c.fx.fever ? 3 : 0) + (c.fx.tachy ? 3 : 0),
      sys: c.sys + A.sys + (c.fx.tachy ? 10 : 0),
      hrv: Math.max(10, 58 + A.hrv - (c.fx.tachy ? 22 : 0) - (c.fx.arrhythmia ? 30 : 0) - co2Excess * 2.2),
    };
    const rate = { hr: 0.3, spo2: 0.2, temp: 0.04, resp: 0.25, sys: 0.2, hrv: 0.25 };
    const jitter = { hr: 1.6, spo2: 0.22, temp: 0.02, resp: 0.5, sys: 1.8, hrv: 2.2 };
    for (const k of Object.keys(target)) {
      c.v[k] += (target[k] - c.v[k]) * rate[k] + noise(jitter[k]);
    }
    c.v.spo2 = Math.min(100, c.v.spo2);
    c.v.hrv = Math.max(8, c.v.hrv);
    push(c.hist.hr, c.v.hr);
    push(c.hist.spo2, c.v.spo2);
    push(c.hist.temp, c.v.temp);
  }

  // Switch a scenario on or off. Returns a note for the event log.
  toggle(event, crewId) {
    const c = this.crew.find((x) => x.id === crewId);
    const flip = (on, title, subject) => ({ subject, title: `${title} ${on ? 'started' : 'ended'}` });
    switch (event) {
      case 'tachy': c.fx.tachy = !c.fx.tachy; return flip(c.fx.tachy, 'Resting tachycardia', c.name);
      case 'fever': c.fx.fever = !c.fx.fever; return flip(c.fx.fever, 'Fever', c.name);
      case 'arrhythmia': c.fx.arrhythmia = !c.fx.arrhythmia; return flip(c.fx.arrhythmia, 'Cardiac arrhythmia', c.name);
      case 'drop': c.lost = !c.lost; return flip(c.lost, 'Sensor dropout', c.name);
      case 'scrub': this.env.scrub = !this.env.scrub; return flip(this.env.scrub, 'CO₂ scrubber fault', 'Simulator');
      case 'leak': this.env.leak = !this.env.leak; return flip(this.env.leak, 'Cabin leak', 'Simulator');
      case 'spe':
        if (this.env.spe) {
          this.env.spe.t = Math.max(this.env.spe.t, 40);
          return flip(false, 'Solar particle event', 'Simulator');
        }
        this.env.spe = { t: 0, peak: this.profile.spePeak };
        return flip(true, 'Solar particle event', 'Simulator');
      default: return null;
    }
  }

  clearAll() {
    this.crew.forEach((c) => {
      c.fx.tachy = false;
      c.fx.fever = false;
      c.fx.arrhythmia = false;
      c.lost = false;
    });
    this.env.scrub = false;
    this.env.leak = false;
    if (this.env.spe) this.env.spe.t = Math.max(this.env.spe.t, 40);
    return { subject: 'Simulator', title: 'All events cleared' };
  }

  setShelter(on) {
    this.env.shelter = on;
    return { subject: 'Crew', title: on ? 'Crew moved to storm shelter' : 'Crew released from storm shelter' };
  }

  // Immutable copy for React state and for the alert engine
  snapshot() {
    const e = this.env;
    return {
      t: this.t,
      hour: this.hour(),
      envId: this.profile.id,
      exTarget: this.profile.exTarget,
      crew: this.crew.map((c) => ({
        id: c.id, name: c.name, role: c.role, age: c.age, max: c.max,
        sys0: c.sys, dia0: c.dia,
        act: c.act, lost: c.lost, lostTicks: c.lostTicks,
        ex: c.ex, sleep: c.sleep, dose: c.dose,
        fx: { ...c.fx },
        v: { ...c.v },
        hist: { hr: [...c.hist.hr], spo2: [...c.hist.spo2], temp: [...c.hist.temp] },
      })),
      env: {
        co2: e.co2, pressure: e.pressure, ppo2: e.ppo2Live ?? e.pressure * 0.209,
        live: Boolean(this.live),
        temp: e.temp, hum: e.hum, dose: e.dose,
        scrub: e.scrub, leak: e.leak, spe: Boolean(e.spe), shelter: e.shelter,
        hist: { co2: [...e.hist.co2], dose: [...e.hist.dose] },
      },
    };
  }
}
