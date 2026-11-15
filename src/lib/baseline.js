// Precision Health: Dynamic Personal Baselines & Statistical Anomaly Detection (Z-scores).
// Aligns with NASA Decadal Precision Health Roadmap: individualized norms vs rigid population limits.

export const CREW_BASELINES = {
  okafor: {
    hr: { mean: 58, sd: 4.2 },
    sys: { mean: 112, sd: 5.0 },
    bp: { mean: 112, sd: 5.0 },
    spo2: { mean: 98.4, sd: 0.8 },
    temp: { mean: 36.7, sd: 0.22 },
    resp: { mean: 13.5, sd: 1.2 },
    hrv: { mean: 62, sd: 6.5 },
  },
  reyes: {
    hr: { mean: 64, sd: 4.5 },
    sys: { mean: 118, sd: 5.5 },
    bp: { mean: 118, sd: 5.5 },
    spo2: { mean: 98.2, sd: 0.8 },
    temp: { mean: 36.8, sd: 0.20 },
    resp: { mean: 14.0, sd: 1.2 },
    hrv: { mean: 54, sd: 5.5 },
  },
  varga: {
    hr: { mean: 61, sd: 4.0 },
    sys: { mean: 110, sd: 4.8 },
    bp: { mean: 110, sd: 4.8 },
    spo2: { mean: 98.5, sd: 0.7 },
    temp: { mean: 36.9, sd: 0.20 },
    resp: { mean: 13.8, sd: 1.1 },
    hrv: { mean: 58, sd: 6.0 },
  },
  tanaka: {
    hr: { mean: 66, sd: 4.8 },
    sys: { mean: 122, sd: 6.0 },
    bp: { mean: 122, sd: 6.0 },
    spo2: { mean: 98.0, sd: 0.8 },
    temp: { mean: 36.7, sd: 0.22 },
    resp: { mean: 14.2, sd: 1.3 },
    hrv: { mean: 49, sd: 5.0 },
  },
};

export function getBaseline(crewId, vitalId) {
  const c = CREW_BASELINES[crewId] || CREW_BASELINES.okafor;
  return c[vitalId] || null;
}

export function calculateZScore(value, crewId, vitalId) {
  if (value == null || isNaN(value)) return null;
  const base = getBaseline(crewId, vitalId);
  if (!base || !base.sd || base.sd <= 0) return null;
  return (value - base.mean) / base.sd;
}

export function getVitalBaselineInfo(crewId, vitalId, currentValue) {
  const base = getBaseline(crewId, vitalId);
  if (!base) return null;
  const z = calculateZScore(currentValue, crewId, vitalId);
  const isAnomaly = z != null && Math.abs(z) >= 2.0;

  return {
    mean: base.mean,
    sd: base.sd,
    z: z != null ? Number(z.toFixed(1)) : null,
    isAnomaly,
    text: `Your baseline: ${base.mean}`,
  };
}
