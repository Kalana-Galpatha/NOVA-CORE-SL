import { describe, it, expect } from 'vitest';
import { AlertEngine, evaluateRules } from './alertEngine.js';

const crew = (over = {}) => ({
  id: 'a', name: 'Test Crew', max: 180, act: 'work', lost: false, lostTicks: 0, ex: 0,
  v: { hr: 70, spo2: 98, temp: 36.8, resp: 14, sys: 115 },
  ...over,
});
const snap = (c = {}, env = {}, hour = 10) => ({
  t: 0,
  hour,
  crew: [crew(c)],
  env: { co2: 3.3, pressure: 101.3, dose: 75, shelter: false, ...env },
});
const feed = (engine, s, n) => {
  for (let i = 0; i < n; i++) engine.update(s);
};

describe('evaluateRules', () => {
  it('returns nothing when everything is nominal', () => {
    expect(evaluateRules(snap())).toHaveLength(0);
  });

  it('allows a high heart rate during exercise but not at rest', () => {
    const running = snap({ act: 'exercise', v: { hr: 150, spo2: 98, temp: 37.2, resp: 28, sys: 150 } });
    expect(evaluateRules(running)).toHaveLength(0);
    const resting = snap({ v: { hr: 150, spo2: 98, temp: 36.8, resp: 14, sys: 115 } });
    expect(evaluateRules(resting).find((r) => r.key === 'hr:a').level).toBe(3);
  });

  it('does not judge health from a lost sensor', () => {
    const rules = evaluateRules(snap({ lost: true, lostTicks: 2, v: { hr: 200, spo2: 70, temp: 41, resp: 40, sys: 200 } }));
    expect(rules).toHaveLength(1);
    expect(rules[0].key).toBe('sig:a');
  });

  it('detects low HRV autonomic strain and cardiac arrhythmia', () => {
    const lowHrv = snap({ v: { hr: 70, spo2: 98, temp: 36.8, resp: 14, sys: 115, hrv: 16 } });
    const rulesHrv = evaluateRules(lowHrv);
    expect(rulesHrv.some((r) => r.key === 'hrv:a')).toBe(true);

    const arrhythmia = snap({ fx: { arrhythmia: true } });
    const rulesArr = evaluateRules(arrhythmia);
    expect(rulesArr.some((r) => r.key === 'arrhythmia:a')).toBe(true);
  });
});

describe('AlertEngine persistence', () => {
  const lowSpo2 = snap({ v: { hr: 70, spo2: 89, temp: 36.8, resp: 14, sys: 115 } });

  it('does not raise after 2 readings but raises after 3', () => {
    const e = new AlertEngine();
    feed(e, lowSpo2, 2);
    expect(e.alerts()).toHaveLength(0);
    feed(e, lowSpo2, 1);
    expect(e.alerts()).toHaveLength(1);
    expect(e.alerts()[0].level).toBe(3);
  });

  it('keeps the alert for 4 normal readings and clears on the 5th', () => {
    const e = new AlertEngine();
    feed(e, lowSpo2, 3);
    feed(e, snap(), 4);
    expect(e.alerts()).toHaveLength(1);
    feed(e, snap(), 1);
    expect(e.alerts()).toHaveLength(0);
  });

  it('escalates after 2 readings at a higher level and un-acknowledges', () => {
    const e = new AlertEngine();
    const caution = snap({ v: { hr: 70, spo2: 92, temp: 36.8, resp: 14, sys: 115 } });
    feed(e, caution, 3);
    e.acknowledge('spo2:a');
    expect(e.alerts()[0].ack).toBe(true);
    feed(e, lowSpo2, 2);
    expect(e.alerts()[0].level).toBe(3);
    expect(e.alerts()[0].ack).toBe(false);
  });

  it('logs raise and clear events', () => {
    const e = new AlertEngine();
    feed(e, snap({}, { co2: 6 }), 3);
    feed(e, snap(), 5);
    const kinds = e.log().map((x) => x.kind);
    expect(kinds).toContain('Raised');
    expect(kinds).toContain('Cleared');
  });

  it('records closed-loop actions with retest intervals', () => {
    const e = new AlertEngine();
    feed(e, lowSpo2, 3);
    expect(e.alerts()).toHaveLength(1);
    e.takeAction('spo2:a', 'Applied supplemental O2 mask', 20);
    const alert = e.alerts()[0];
    expect(alert.ack).toBe(true);
    expect(alert.action.text).toBe('Applied supplemental O2 mask');
    expect(alert.action.retestMinutes).toBe(20);
    const kinds = e.log().map((x) => x.kind);
    expect(kinds).toContain('Action');
  });
});
