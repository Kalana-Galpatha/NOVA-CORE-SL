// Immune system monitoring & dysregulation model grounded in NASA Human Research Program (HRP) evidence.
// Factors: Space radiation, microgravity-induced leukocyte shifts, chronic stress, circadian misalignment.

export const IMMUNE_LIMITS = [25, 50, 75]; // % risk score thresholds for Watch, Caution, Warning

export function calculateImmuneRisk({
  cumDose = 0,         // mSv cumulative radiation
  refDose = 600,       // mSv reference career limit
  sleepDebt = 0,       // hours of accumulated sleep debt
  stressLevel = 2,     // 1 to 5 chronic stress rating
  symptomRating = 0,   // 0 to 4 (0: None, 1: Very mild, 2: Noticeable, 3: Moderate, 4: Severe)
  fever = false,       // acute fever indicator
  gravity = 0,         // 0 (microgravity) to 1 (Earth)
} = {}) {
  // 1. Radiation factor (hematopoietic & immune cell suppression): up to 30 points
  const radRatio = Math.min(1.5, cumDose / refDose);
  const radScore = radRatio * 25;

  // 2. Neuroendocrine & Circadian factor (cortisol & catecholamine immunosuppression): up to 35 points
  const sleepFactor = Math.min(15, (sleepDebt / 10) * 15);
  const stressFactor = Math.min(20, Math.max(0, (stressLevel - 1) / 4) * 20);

  // 3. Microgravity structural factor (blunted T-cell activation / blastogenesis): up to 15 points
  const gStress = (1 - Math.min(1, Math.max(0, gravity))) * 15;

  // 4. Clinical symptom log factor (active inflammation / latent viral shedding): up to 25 points
  const symFactor = Math.min(25, symptomRating * 5 + (fever ? 10 : 0));

  const total = Math.min(100, Math.round(radScore + sleepFactor + stressFactor + gStress + symFactor));

  // Determine alert level (0 = Nominal, 1 = Watch, 2 = Caution, 3 = Warning)
  let level = 0;
  if (total >= IMMUNE_LIMITS[2]) level = 3;
  else if (total >= IMMUNE_LIMITS[1]) level = 2;
  else if (total >= IMMUNE_LIMITS[0]) level = 1;

  // Latent viral reactivation likelihood (EBV, VZV, CMV)
  let viralReactivation = 'Low';
  if (total >= 70 || (stressLevel >= 4 && sleepDebt >= 8)) {
    viralReactivation = 'High';
  } else if (total >= 45 || symptomRating >= 2) {
    viralReactivation = 'Elevated';
  } else if (total >= 25) {
    viralReactivation = 'Moderate';
  }

  const statusLabel =
    level === 3 ? 'Significantly Impaired' :
    level === 2 ? 'Dysregulated' :
    level === 1 ? 'Mildly Suppressed' : 'Optimal';

  const advice =
    level === 3 ? 'High immune dysregulation detected. High risk of latent viral reactivation (EBV/VZV). Initiate immune countermeasure protocol: ensure 8+ h sleep, initiate antioxidant regimen, and alert the medical officer for prophylactic review.' :
    level === 2 ? 'Elevated immune stress. Prioritize circadian alignment, reduce high-intensity workload, and inspect skin and mucosal barriers daily.' :
    level === 1 ? 'Mild immune suppression. Monitor sleep quality and log any new skin flare, cold sore, or allergic reaction.' :
    'Immune indicators and cellular resilience are nominal.';

  return {
    score: total,
    level,
    statusLabel,
    viralReactivation,
    advice,
    components: {
      radiation: Math.round(radScore),
      circadianSleep: Math.round(sleepFactor),
      stress: Math.round(stressFactor),
      microgravity: Math.round(gStress),
      clinicalSymptoms: Math.round(symFactor),
    },
  };
}
