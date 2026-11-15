import { describe, it, expect } from 'vitest';
import { RESEARCH } from './research.js';
import { INDICATORS } from './education.js';

describe('research library', () => {
  it('covers bone, vision, radiation and sleep with NTRS links', () => {
    expect(RESEARCH.map((r) => r.id)).toEqual(['bone', 'vision', 'radiation', 'sleep']);
    for (const r of RESEARCH) {
      expect(INDICATORS[r.indicator]).toBeTruthy();
      expect(r.papers.length).toBeGreaterThan(0);
      for (const p of r.papers) expect(p.url).toMatch(/^https:\/\/ntrs\.nasa\.gov\/citations\/\d{11}$/);
    }
  });
});
