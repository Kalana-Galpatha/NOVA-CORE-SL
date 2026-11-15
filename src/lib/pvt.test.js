import { describe, it, expect } from 'vitest';
import { scorePVT } from './pvt.js';

describe('Psychomotor Vigilance Test (PVT) Model', () => {
  it('evaluates nominal fast reaction times with 0 lapses', () => {
    const trials = [215, 228, 205, 240, 235];
    const res = scorePVT(trials);
    expect(res.level).toBe(0);
    expect(res.meanRT).toBeLessThan(240);
    expect(res.lapses).toBe(0);
    expect(res.evaEligible).toBe(true);
    expect(res.status).toBe('Nominal Alertness');
  });

  it('detects operational fatigue when reaction times slow and lapses occur', () => {
    const trials = [320, 540, 510, 310, 290];
    const res = scorePVT(trials);
    expect(res.lapses).toBe(2);
    expect(res.level).toBeGreaterThanOrEqual(2);
    expect(res.evaEligible).toBe(false);
    expect(res.recommendation).toContain('EVA');
  });

  it('detects false starts and handles all anticipations gracefully', () => {
    const mixed = [80, 220, 230];
    const res = scorePVT(mixed);
    expect(res.falseStarts).toBe(1);
    expect(res.trialCount).toBe(3);

    const allFalse = [50, 60, 70];
    const invalidRes = scorePVT(allFalse);
    expect(invalidRes.level).toBe(3);
    expect(invalidRes.status).toContain('Invalid');
  });
});
