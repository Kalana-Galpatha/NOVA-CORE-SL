// Psychomotor Vigilance Test (PVT) analysis engine.
// Grounded in NASA operational cognitive monitoring on the International Space Station (ISS).
// Measures behavioral fatigue, micro-sleep lapses, and attentional stability under confinement.

export function scorePVT(trials = []) {
  if (!trials || trials.length === 0) {
    return {
      trialCount: 0,
      meanRT: null,
      medianRT: null,
      lapses: 0,
      falseStarts: 0,
      score: 100,
      level: 0,
      status: 'No Test Completed',
      evaEligible: true,
      recommendation: 'Complete today’s 60-second reaction test to verify alertness before critical operations.',
    };
  }

  const falseStarts = trials.filter((t) => t < 100).length;
  const valid = trials.filter((t) => t >= 100);

  if (valid.length === 0) {
    return {
      trialCount: trials.length,
      meanRT: 0,
      medianRT: 0,
      lapses: 0,
      falseStarts,
      score: 0,
      level: 3,
      status: 'Invalid Test (All False Starts)',
      evaEligible: false,
      recommendation: 'Test invalid due to anticipatory tapping. Please re-take when resting.',
    };
  }

  const sorted = [...valid].sort((a, b) => a - b);
  const sum = valid.reduce((acc, v) => acc + v, 0);
  const meanRT = Math.round(sum / valid.length);
  const medianRT = sorted[Math.floor(sorted.length / 2)];
  const lapses = valid.filter((t) => t >= 500).length;

  // NASA ISS Scoring Standard:
  // Baseline mean RT is ~210-250 ms.
  // 100 points baseline, -1.5 points per 10ms over 240ms, -15 points per lapse (>500ms), -5 points per false start.
  let rawScore = 100;
  if (meanRT > 240) {
    rawScore -= ((meanRT - 240) / 10) * 1.5;
  }
  rawScore -= lapses * 15;
  rawScore -= falseStarts * 5;

  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Alert level: 0 = Nominal, 1 = Watch, 2 = Caution, 3 = Warning
  let level = 0;
  let status = 'Nominal Alertness';
  let evaEligible = true;

  if (score < 60 || lapses >= 3 || meanRT >= 380) {
    level = 3;
    status = 'Severe Impairment / Exhaustion';
    evaEligible = false;
  } else if (score < 75 || lapses >= 2 || meanRT >= 320) {
    level = 2;
    status = 'Operational Fatigue';
    evaEligible = false;
  } else if (score < 88 || lapses >= 1 || meanRT >= 280) {
    level = 1;
    status = 'Mild Attentional Slowing';
    evaEligible = true;
  }

  let recommendation = 'Cognitive speed and attentional vigilance are nominal. Clear for safety-critical tasks.';
  if (level === 3) {
    recommendation = 'Critical alertness deficit detected. Immediate sleep period or 30-minute nap prescribed. Strictly prohibited from EVA, robotic arm, or docking maneuvers.';
  } else if (level === 2) {
    recommendation = 'Cognitive reaction time slowed with attentional lapses. Stand down from high-risk tasks. Review sleep debt and cabin CO₂ levels.';
  } else if (level === 1) {
    recommendation = 'Slight reaction time delay. Take a 5-minute break and ensure adequate hydration before fine motor procedures.';
  }

  return {
    trialCount: trials.length,
    meanRT,
    medianRT,
    fastest: sorted[0],
    slowest: sorted[sorted.length - 1],
    lapses,
    falseStarts,
    score,
    level,
    status,
    evaEligible,
    recommendation,
  };
}
