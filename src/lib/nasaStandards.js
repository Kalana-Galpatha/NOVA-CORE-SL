// Numbers quoted from NASA-STD-3001 Volume 2 (Rev D), "NASA Spaceflight Human-System Standard:
// Crew Health". Requirement IDs are given so each value can be checked at https://standards.nasa.gov.
// Only values read directly from the standard are listed. Alert tiers between them are app choices.

export const NASA_STD_3001 = {
  title: 'NASA-STD-3001 Vol. 2 Rev D',
  url: 'https://standards.nasa.gov/standard/NASA/NASA-STD-3001-VOL-2',
  // [V2 6006] total pressure for indefinite crew exposure: 34.5 kPa < P <= 103 kPa
  totalPressureKpa: { min: 34.5, max: 103 },
  // [V2 6004] average one-hour ppCO2 in the habitable volume: no more than 3 mmHg
  co2OneHourAvgMmHg: 3,
  // [V2 6003] Table 6.2-1, inspired O2 partial pressure PIO2 = (PB - 47 mmHg) x FIO2
  pio2MmHg: { normoxiaLow: 145, normoxiaHigh: 155, mildHypoxiaLow: 127, absoluteLow1hTwa: 122 },
  // [V2 6013] rationale: crew performance zone 20-25 C and 30-60 % relative humidity
  performanceZone: { tempC: [20, 25], rh: [30, 60] },
};

const MMHG_PER_KPA = 7.50062;

// Cabin ppO2 (kPa) that gives a target inspired PIO2 (mmHg) at a given total cabin pressure.
// PIO2 = (PB - 47) x FIO2 and cabin ppO2 = FIO2 x PB, so ppO2 = PIO2 x PB / (PB - 47).
export function cabinPpo2ForPio2(pio2MmHg, totalKpa = 101.325) {
  const pb = totalKpa * MMHG_PER_KPA;
  return (pio2MmHg * totalKpa) / (pb - 47);
}

const round1 = (v) => Math.round(v * 10) / 10;

// Oxygen alert tiers at normal cabin pressure: below normoxia (watch), below the mild-hypoxia
// limit (caution), below the absolute 1-hour limit (warning). About [20.6, 18.0, 17.3] kPa.
export const PPO2_LIMITS_KPA = [
  round1(cabinPpo2ForPio2(NASA_STD_3001.pio2MmHg.normoxiaLow)),
  round1(cabinPpo2ForPio2(NASA_STD_3001.pio2MmHg.mildHypoxiaLow)),
  round1(cabinPpo2ForPio2(NASA_STD_3001.pio2MmHg.absoluteLow1hTwa)),
];
