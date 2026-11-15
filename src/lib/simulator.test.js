import { describe, it, expect } from 'vitest';
import { Simulator } from './simulator.js';
import { AlertEngine } from './alertEngine.js';
import { buildInsights } from './insights.js';
import { ENVIRONMENTS } from './environments.js';
import { gaugeFor, hrLevel } from './status.js';

const run = (sim, engine, n) => {
  for (let i = 0; i < n; i++) {
    sim.tick();
    engine.update(sim.snapshot());
  }
};

describe('Simulator', () => {
  it('starts each environment near its own baseline', () => {
    for (const p of Object.values(ENVIRONMENTS)) {
      const sim = new Simulator(p);
      sim.warmUp();
      const s = sim.snapshot();
      expect(Math.abs(s.env.co2 - p.co2)).toBeLessThan(0.6);
      expect(Math.abs(s.env.dose - p.dose)).toBeLessThan(p.dose * 0.3);
      expect(s.exTarget).toBe(p.exTarget);
    }
  });

  it('a scrubber fault raises CO₂ and eventually an alert', () => {
    const sim = new Simulator(ENVIRONMENTS.station);
    sim.warmUp();
    const engine = new AlertEngine();
    sim.toggle('scrub');
    run(sim, engine, 30);
    expect(engine.alerts().some((a) => a.key === 'co2')).toBe(true);
  });

  it('a solar particle event raises dose, and shelter lowers what the crew collects', () => {
    const a = new Simulator(ENVIRONMENTS.spacecraft);
    const b = new Simulator(ENVIRONMENTS.spacecraft);
    a.warmUp(); b.warmUp();
    a.toggle('spe'); b.toggle('spe'); b.setShelter(true);
    for (let i = 0; i < 40; i++) { a.tick(); b.tick(); }
    expect(a.snapshot().env.dose).toBeGreaterThan(1000);
    expect(b.snapshot().crew[0].dose).toBeLessThan(a.snapshot().crew[0].dose);
  });

  it('a sensor dropout leaves gaps in the history', () => {
    const sim = new Simulator(ENVIRONMENTS.base);
    sim.warmUp();
    sim.toggle('drop', 'okafor');
    for (let i = 0; i < 5; i++) sim.tick();
    expect(sim.snapshot().crew[0].hist.hr.slice(-5)).toEqual([null, null, null, null, null]);
  });
});

describe('status and insights', () => {
  it('gauges have room above the top limit and below the bottom limit', () => {
    for (const m of ['spo2', 'temp', 'resp', 'sys', 'co2', 'pressure', 'ppo2', 'dose']) {
      const g = gaugeFor(m);
      if (g.hi) expect(g.max).toBeGreaterThan(g.hi[2]);
      if (g.lo) expect(g.min).toBeLessThan(g.lo[2]);
    }
    for (const act of ['sleep', 'work', 'exercise']) {
      const g = gaugeFor('hr', { act, max: 176 });
      expect(g.max).toBeGreaterThan(g.hi[2]);
      expect(g.min).toBeLessThanOrEqual(g.lo[2]);
    }
  });

  it('judges heart rate by activity', () => {
    expect(hrLevel(150, 'exercise', 176).level).toBe(0);
    expect(hrLevel(150, 'work', 176).level).toBe(3);
    expect(hrLevel(33, 'sleep', 176)).toMatchObject({ level: 2, dir: 'low' });
  });

  it('builds plain insights for the astronaut', () => {
    const p = ENVIRONMENTS.rover;
    const sim = new Simulator(p);
    sim.warmUp();
    const ins = buildInsights({ snap: sim.snapshot(), crewId: 'okafor', profile: p, alerts: [] });
    const ids = ins.map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(['alerts', 'dose', 'exercise', 'tip']));
    expect(ins.every((i) => i.text.length > 10)).toBe(true);
  });
});
