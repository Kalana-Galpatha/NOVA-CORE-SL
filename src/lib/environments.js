// One profile per place the crew can live. The simulator, alert rules, routine and
// advice all read from these values, so adding an environment means adding one entry.
// Values are illustrative. Replace them with the vehicle's real specification.
// Resting CO2 sits under NASA's 3 mmHg one-hour limit (NASA-STD-3001 [V2 6004]).

export const ENVIRONMENTS = {
  spacecraft: {
    id: 'spacecraft',
    name: 'Spacecraft',
    sub: 'Deep-space transit',
    gravity: 0,
    gravityLabel: 'Microgravity',
    pressure: 101.3, co2: 2.8, dose: 75, temp: 22.4, hum: 46,
    exTarget: 120, spePeak: 1600, shelterFactor: 0.3,
    commsDelaySec: 480, commsLabel: '8 min one-way (16m round-trip)', autonomous: true,
    tipTitle: 'Fluid shift',
    tip: 'In microgravity body fluids move toward your head. A puffy face and a stuffy nose are common in the first days and ease with time.',
    hazards: [
      { title: 'Radiation', text: 'Far from Earth’s magnetic field the crew gets a steady dose and can face solar storms. The storm shelter cuts the dose sharply.' },
      { title: 'Bone and muscle loss', text: 'Without gravity your body stops building strength. Two hours of exercise a day is the main defence.' },
      { title: 'Isolation and delay', text: 'Messages take minutes to reach Earth, so you may decide with less help. Routine check-ins keep small problems small.' },
    ],
  },
  station: {
    id: 'station',
    name: 'Space station',
    sub: 'Low Earth orbit',
    gravity: 0,
    gravityLabel: 'Microgravity',
    pressure: 101.3, co2: 2.8, dose: 30, temp: 22.0, hum: 45,
    exTarget: 120, spePeak: 300, shelterFactor: 0.5,
    commsDelaySec: 0.5, commsLabel: '0.5s (near real-time link)', autonomous: false,
    tipTitle: 'Eyes and vision',
    tip: 'Many long-stay crew notice changes in near vision. The routine vision check catches this early, so do it even when your eyes feel fine.',
    hazards: [
      { title: 'Bone and muscle loss', text: 'Long stays in microgravity thin bones and shrink muscles. Daily exercise slows both.' },
      { title: 'Vision changes', text: 'Fluid shifts can press on the back of the eye. Report blur or trouble reading small print.' },
      { title: 'CO₂ pockets', text: 'Air does not rise or sink in microgravity, so CO₂ can gather around your head while you sleep. Good airflow matters.' },
    ],
  },
  rover: {
    id: 'rover',
    name: 'Pressurized rover',
    sub: 'Lunar surface sortie',
    gravity: 0.17,
    gravityLabel: 'Lunar gravity',
    pressure: 101.3, co2: 2.9, dose: 55, temp: 24.5, hum: 40,
    exTarget: 90, spePeak: 1400, shelterFactor: 0.4,
    commsDelaySec: 1.3, commsLabel: '1.3s one-way', autonomous: false,
    tipTitle: 'Small space, big effect',
    tip: 'In a small rover CO₂ and heat build up quickly. Check the air reading each time you change task.',
    hazards: [
      { title: 'Small cabin air', text: 'Few people in a tiny volume raise CO₂ and humidity fast. Keep fans running and watch the CO₂ gauge.' },
      { title: 'Dust', text: 'Lunar dust is sharp and clings to suits. It irritates eyes and lungs, so wipe suits before you take them off.' },
      { title: 'Surface radiation', text: 'There is no thick atmosphere or magnetic field. During a solar storm, head for the shielded area.' },
    ],
  },
  base: {
    id: 'base',
    name: 'Surface base',
    sub: 'Mars habitat',
    gravity: 0.38,
    gravityLabel: 'Mars gravity',
    pressure: 101.3, co2: 2.7, dose: 28, temp: 21.0, hum: 45,
    exTarget: 90, spePeak: 600, shelterFactor: 0.15,
    commsDelaySec: 840, commsLabel: '14 min one-way (28m round-trip)', autonomous: true,
    tipTitle: 'Dust',
    tip: 'Fine dust irritates eyes and lungs. Wipe suits in the airlock before you come in.',
    hazards: [
      { title: 'Dust and chemicals', text: 'Surface dust is fine and can carry irritating chemicals. Keep it out of the living area and tell the medic about cough or red eyes.' },
      { title: 'Partial gravity', text: 'Mars gravity is about 38 percent of Earth’s. It is better than none, but exercise is still needed to keep bones strong.' },
      { title: 'Radiation', text: 'The thin atmosphere gives some cover. In a solar storm, move to the shielded room.' },
    ],
  },
};

export const ENV_LIST = Object.values(ENVIRONMENTS);
