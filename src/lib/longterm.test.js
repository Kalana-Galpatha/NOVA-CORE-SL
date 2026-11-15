import { describe, it, expect } from 'vitest';
import { LongTerm, LT_KEYS } from './longterm.js';
import { ENVIRONMENTS } from './environments.js';
import { evaluateRules } from './alertEngine.js';
import { SYMPTOMS, triage } from './triage.js';

const tasks = { p: { a: { done: {} } } };
const make = (env) => new LongTerm({ crewIds: ['a'], profile: ENVIRONMENTS[env], tasks });
const snap = (t, ex = 0, over = {}) => ({
  t, exTarget: 120, hour: (t / 3600) % 24,
  crew: [{ id: 'a', name: 'A', ex, act: 'work', sleep: 8, dose: 86, v: { hr: 70, spo2: 98, temp: 36.8, resp: 14, sys: 115 }, ...over }],
  env: { co2: 3.3, dose: 75 },
});
const days = (lt, n, ex) => {
  for (let i = 0; i < n * 1440; i++) lt.update(snap(47 * 86400 + i * 60, ex));
};

describe('LongTerm', () => {
  it('starts inside every limit and reports a number for each risk', () => {
    const m = make('station').metrics('a');
    for (const k of LT_KEYS) expect(Number.isFinite(m[k].v)).toBe(true);
    expect(Math.max(...LT_KEYS.map((k) => m[k].level))).toBe(0);
  });

  it('loses bone faster in microgravity than on Mars', () => {
    const a = make('station');
    const b = make('base');
    const a0 = a.metrics('a').bone.v;
    const b0 = b.metrics('a').bone.v;
    days(a, 3, 120);
    days(b, 3, 120);
    expect(a.metrics('a').bone.v - a0).toBeGreaterThan(b.metrics('a').bone.v - b0);
  });

  it('keeping up exercise slows bone loss', () => {
    const fit = make('station');
    const idle = make('station');
    days(fit, 3, 120);
    days(idle, 3, 0);
    expect(idle.metrics('a').bone.v).toBeGreaterThan(fit.metrics('a').bone.v);
  });

  it('counts days without the water task and clears them when it is done', () => {
    const lt = make('station');
    days(lt, 3, 120);
    expect(lt.metrics('a').hydration.v).toBeGreaterThanOrEqual(2);
    tasks.p.a.done.hydration = { t: 0 };
    days(lt, 1, 120);
    tasks.p.a.done = {};
    expect(lt.metrics('a').hydration.v).toBeLessThan(2);
  });

  it('feeds alerts and tells the crew how long until the next limit', () => {
    const lt = make('station');
    lt.s.a.bone = 2.5;
    const s = { ...snap(0), long: lt.snapshot() };
    const alert = evaluateRules(s).find((r) => r.key === 'lt:bone:a');
    expect(alert.level).toBe(1);
    expect(alert.adv).toBe('lt_bone');
    expect(lt.metrics('a').bone.eta).toBeGreaterThan(0);
  });
});

describe('triage', () => {
  const ctx = { co2: 0, co2v: 3.3, fever: 0, vision: 0, muscle: 0, hydration: 0, sleep: 0 };
  const get = (id) => SYMPTOMS.find((s) => s.id === id);

  it('sends chest pain to the surgeon every time', () => {
    expect(triage(get('chest'), ctx).level).toBe(3);
  });

  it('raises a headache when cabin CO₂ is high and says why', () => {
    expect(triage(get('headache'), ctx).level).toBe(1);
    const r = triage(get('headache'), { ...ctx, co2: 2, co2v: 5.6 });
    expect(r.level).toBe(2);
    expect(r.note).toContain('5.6');
  });

  it('treats a fever with a wound as urgent', () => {
    expect(triage(get('wound'), { ...ctx, fever: 1 }).level).toBe(3);
  });
});
