import { describe, it, expect } from 'vitest';
import { calculateImmuneRisk, IMMUNE_LIMITS } from './immune.js';

describe('Immune Risk Model', () => {
  it('returns nominal state when baseline conditions are calm', () => {
    const res = calculateImmuneRisk({
      cumDose: 10,
      refDose: 600,
      sleepDebt: 0,
      stressLevel: 1,
      symptomRating: 0,
      fever: false,
      gravity: 1, // Earth gravity
    });
    expect(res.level).toBe(0);
    expect(res.score).toBeLessThan(IMMUNE_LIMITS[0]);
    expect(res.statusLabel).toBe('Optimal');
    expect(res.viralReactivation).toBe('Low');
  });

  it('elevates risk when microgravity, radiation, and chronic sleep debt accumulate', () => {
    const res = calculateImmuneRisk({
      cumDose: 300,
      refDose: 600,
      sleepDebt: 10,
      stressLevel: 4,
      symptomRating: 1,
      fever: false,
      gravity: 0, // Microgravity
    });
    expect(res.level).toBeGreaterThanOrEqual(1);
    expect(res.score).toBeGreaterThanOrEqual(50);
    expect(['Elevated', 'High']).toContain(res.viralReactivation);
  });

  it('triggers critical warning level when acute fever and severe symptoms present', () => {
    const res = calculateImmuneRisk({
      cumDose: 450,
      refDose: 600,
      sleepDebt: 12,
      stressLevel: 5,
      symptomRating: 3,
      fever: true,
      gravity: 0,
    });
    expect(res.level).toBe(3);
    expect(res.statusLabel).toBe('Significantly Impaired');
    expect(res.viralReactivation).toBe('High');
    expect(res.components.clinicalSymptoms).toBeGreaterThan(15);
  });
});
