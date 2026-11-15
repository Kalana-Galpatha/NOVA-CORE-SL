import { NASA_STD_3001, PPO2_LIMITS_KPA } from './nasaStandards.js';
// Shared constants. One simulator tick equals one minute of mission time.
export const TICK_SECONDS = 60;
export const HISTORY = 90; // samples kept for charts (90 minutes)
export const MISSION_START = 47 * 86400 + 8 * 3600 + 12 * 60; // day 47, 08:12
// Mission start synced to the real local clock: same mission day, real time of day.
export function missionStartNow(now = new Date()) {
  const secs = now.getHours() * 3600 + now.getMinutes() * 60;
  return 47 * 86400 + secs;
}
export const REAL_TIME = 1 / 60; // sim ticks (minutes) per real second = real time
export const REFERENCE_DOSE = 600; // mSv, illustrative career reference
export const EXERCISE_OK = 0.75; // share of the daily exercise target that counts as done

export const LEVELS = ['Nominal', 'Watch', 'Caution', 'Warning'];
export const ACTIVITY_LABEL = { sleep: 'Sleeping', work: 'On duty', exercise: 'Exercising' };

// Alert limits: [watch, caution, warning].
// ppO2 tiers and the one-hour CO2 average follow NASA-STD-3001 (see nasaStandards.js). All others are illustrative.
// Replace with the mission's medical requirements before any real use.
export const LIMITS = {
  hrWork: { hi: [100, 115, 135], lo: [48, 42, 38] },
  hrSleep: { hi: [85, 100, 120], lo: [38, 34, 30] },
  hrExercise: [0.9, 0.97, 1.03], // fractions of 220 - age
  spo2: [95, 93, 90],
  temp: [37.8, 38.3, 39.0],
  resp: [22, 26, 30],
  sys: [140, 155, 170],
  hrv: [35, 25, 18],
  co2: [4.0, 5.3, 7.0],
  co2Avg1h: NASA_STD_3001.co2OneHourAvgMmHg, // [V2 6004]
  pressure: [100, 97, 93],
  ppo2: PPO2_LIMITS_KPA, // derived from NASA-STD-3001 Table 6.2-1
  dose: [150, 400, 1000],
};

export const ADVICE = {
  co2: 'Check scrubber bed and fan status. Switch to the backup CO₂ removal unit and limit exertion until CO₂ is below 4 mmHg.',
  press: 'Walk the hatch and seal list for a leak. Close off the affected module and start reserve gas makeup.',
  ppo2: 'Add oxygen from the reserve supply and confirm oxygen generator output.',
  rad: 'Move the crew to the storm shelter and stay there until the dose rate is back under 150 µSv/h.',
  hr: 'Rest and confirm with a manual pulse check. If it stays abnormal at rest, contact the flight surgeon.',
  spo2: 'Check sensor fit, then recheck with the backup pulse oximeter. Consider supplemental oxygen if the low reading is confirmed.',
  temp: 'Confirm with an oral temperature. Begin cooling and hydration, and log symptoms for the flight surgeon.',
  resp: 'Check cabin CO₂ and ask about symptoms. Confirm with a manual breath count.',
  sys: 'Recheck with the cuff after five minutes of rest.',
  hrv: 'Rest and practice rhythmic breathing for 5 minutes. Check sleep debt and review physical workload.',
  arrhythmia: 'Stop exertion and sit quietly. Attach the 1-lead ECG sensor and transmit rhythm strip to the flight surgeon or medical officer.',
  ex: 'Reschedule the session and note it for the surgeon’s weekly review.',
  lt_bone: 'Finish the full exercise session every day, with the loaded (resistive) exercises. Ask the flight surgeon about a bone density scan, calcium and vitamin D.',
  lt_muscle: 'Add resistance work for legs, back and core. Log any missed session and tell the surgeon at the weekly review.',
  lt_vision: 'Repeat the vision check and report blur or trouble reading small print. The surgeon may ask for an eye scan.',
  lt_hydration: 'Drink a full 500 mL pouch with each meal. Low fluid plus calcium lost from bone raises kidney stone risk. Report side or back pain.',
  lt_sleep: 'Keep a fixed sleep window, dim the lights an hour before, and check cabin CO₂ and noise. Tell the surgeon if it continues.',
  lt_stress: 'Talk with the crew or book a family call. Tell the surgeon if low mood, irritability or poor focus last several days.',
  lt_cumdose: 'Spend less time outside the shelter, plan work for low-radiation periods and review the dose budget with the surgeon.',
  lt_immune: 'Prioritize restorative sleep (8+ h), log mucosal or skin changes, initiate antioxidant nutritional countermeasure, and consult the medical officer for latent viral flare prophylaxis.',
  sig: 'Reseat the sensor patch and check its battery. Take manual vitals every 30 minutes until the signal returns.',
};
