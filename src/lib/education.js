// Plain-language content for astronauts who are not medical experts.

export const STATUS_TEXT = [
  'Inside the usual range.',
  'A little outside the usual range. Keep an eye on it.',
  'Clearly outside the usual range. Follow the suggested step.',
  'Well outside the safe range. Tell the flight surgeon now.',
];

export const HERO_TEXT = ['All clear', 'Keep an eye on it', 'Needs attention', 'Act now'];

export const INDICATORS = {
  hr: {
    name: 'Heart rate', unit: 'bpm',
    what: 'How many times your heart beats each minute.',
    normal: 'About 50 to 100 at rest. Higher during exercise, lower in sleep.',
    why: 'Stress, heat, high CO₂, dehydration and illness all push it up. In space your heart works a little differently, so a trend over days tells you more than one number.',
    ifFlagged: 'Sit quietly for five minutes and measure again. If it stays high or low at rest, tell the flight surgeon.',
  },
  spo2: {
    name: 'Blood oxygen', unit: '%',
    what: 'The share of your blood that is carrying oxygen (called SpO₂).',
    normal: '95 to 100 percent.',
    why: 'A falling value can be an early sign of low cabin oxygen, a leak or a poorly fitted sensor.',
    ifFlagged: 'Make sure the sensor is snug and warm, then measure again. If it stays under 93, check the cabin oxygen and call the flight surgeon.',
  },
  temp: {
    name: 'Core temperature', unit: '°C',
    what: 'The temperature deep inside your body.',
    normal: '36.1 to 37.8 °C.',
    why: 'Without air rising off your skin you can overheat during exercise. A fever can mean infection.',
    ifFlagged: 'Rest, drink water and cool down. Confirm with an oral thermometer and log how you feel.',
  },
  resp: {
    name: 'Breathing rate', unit: '/min',
    what: 'How many breaths you take each minute.',
    normal: '12 to 20 at rest.',
    why: 'High CO₂ in the cabin makes you breathe faster before you notice any symptom.',
    ifFlagged: 'Check the cabin CO₂ reading. A headache or a stuffy feeling points to the air.',
  },
  bp: {
    name: 'Blood pressure', unit: 'mmHg',
    what: 'The force of blood on your artery walls. The top number (systolic) is the peak during a heartbeat.',
    normal: 'A top number under about 130 at rest.',
    why: 'Stress, salty food, poor sleep and fluid shifts can raise it. Measure at the same time each day so readings compare fairly.',
    ifFlagged: 'Rest for five minutes and measure again with the arm at heart height.',
  },
  hrv: {
    name: 'Heart rate variability', unit: 'ms',
    what: 'The variation in milliseconds between consecutive heartbeats (RMSSD).',
    normal: 'About 40 to 80 ms at rest. Higher when rested, lower under stress.',
    why: 'HRV reflects autonomic nervous system balance. In space, microgravity cardiovascular deconditioning and chronic stress depress HRV before other signs appear.',
    ifFlagged: 'Sit quietly, breathe rhythmically, hydrate, and notify the medical officer if it stays below 25 ms.',
  },
  co2: {
    name: 'Cabin CO₂', unit: 'mmHg',
    what: 'The carbon dioxide you and your crew breathe out, measured in the cabin air.',
    normal: 'Under 4 mmHg.',
    why: 'In microgravity CO₂ does not sink away, so a pocket can build up around your head. Headaches and tiredness come first.',
    ifFlagged: 'Move to fresh airflow, tell the crew and check the CO₂ scrubber.',
  },
  pressure: {
    name: 'Cabin pressure', unit: 'kPa',
    what: 'How hard the cabin air pushes on you. Earth at sea level is about 101 kPa.',
    normal: 'About 101 kPa.',
    why: 'A steady drop points to a leak. You may feel ear pressure or shortness of breath.',
    ifFlagged: 'Tell the crew, find the leak and close the affected module.',
  },
  ppo2: {
    name: 'Oxygen pressure', unit: 'kPa',
    what: 'How much of the cabin pressure comes from oxygen (called ppO₂).',
    normal: '20 kPa or more.',
    why: 'Your body needs enough oxygen pressure to fill your blood. It falls when the cabin leaks or the oxygen generator slows.',
    ifFlagged: 'Add reserve oxygen and confirm the generator is running.',
  },
  dose: {
    name: 'Radiation rate', unit: 'µSv/h',
    what: 'How much radiation the cabin is passing to your body each hour.',
    normal: 'A steady background that depends on where you are.',
    why: 'Radiation damage adds up over a mission. A solar storm can raise the rate many times over within minutes.',
    ifFlagged: 'Go to the shielded shelter and stay until the rate drops.',
  },
};

Object.assign(INDICATORS, {
  bone: { name: 'Bone density loss', unit: '%', what: 'How much bone strength you have lost since the start, estimated from loading and exercise.', normal: 'Under 2 percent. About 1 percent a month is typical in microgravity without enough exercise.', why: 'Bones thin when gravity does not load them. Recovery after the mission is slow.', ifFlagged: 'Do every exercise session in full, ask about calcium and vitamin D, and request a scan.' },
  muscle: { name: 'Muscle loss', unit: '%', what: 'How much strength you have lost, mostly in legs and back.', normal: 'Under 8 percent.', why: 'Postural muscles do little work in microgravity and shrink even with exercise.', ifFlagged: 'Add resistance work and log missed sessions.' },
  vision: { name: 'Near-vision shift', unit: 'D', what: 'How much your reading vision has moved toward farsightedness (diopters).', normal: 'Under 0.5 D.', why: 'Fluid shifts toward the head can press on the back of the eye (called SANS).', ifFlagged: 'Repeat the vision check, report blur, and ask for an eye scan.' },
  hydration: { name: 'Low-fluid days', unit: 'days', what: 'Days in a row you did not finish your water target.', normal: '0 days.', why: 'Thirst is weaker in microgravity. Low fluid and calcium lost from bone raise kidney stone risk.', ifFlagged: 'Drink a full pouch with each meal and report side or back pain.' },
  sleep: { name: 'Sleep debt', unit: 'h', what: 'Hours of sleep you owe, counted from short nights.', normal: 'Under 4 hours.', why: 'About 16 sunrises a day, noise and high CO₂ all break sleep. Debt hurts mood and judgement.', ifFlagged: 'Keep a fixed sleep window, dim lights early and check the air.' },
  stress: { name: 'Stress trend', unit: '/5', what: 'Your recent mood check-ins, smoothed over days.', normal: 'Under 3.5 out of 5.', why: 'Isolation, delay and confinement build stress quietly.', ifFlagged: 'Talk to the crew or the medical officer early.' },
  cumdose: { name: 'Mission radiation dose', unit: '% ref', what: 'Your total dose so far as a share of the mission reference.', normal: 'Under 50 percent.', why: 'Radiation damage adds up and cannot be undone.', ifFlagged: 'Shelter in storms and review the dose budget with the surgeon.' },
  immune: { name: 'Immune dysregulation', unit: '%', what: 'Estimated risk of immune suppression and latent virus reactivation from radiation, microgravity, and stress.', normal: 'Under 25 percent.', why: 'Deep space radiation and microgravity alter T-cell and natural killer cell function, allowing dormant viruses like Epstein-Barr and Varicella-Zoster to reactivate.', ifFlagged: 'Prioritize 8+ h restorative sleep, log any mucosal lesions or rashes, and consult the medical officer for prophylactic countermeasures.' },
});

export const GLOSSARY = [
  { term: 'bpm', def: 'Beats per minute. The unit for heart rate.' },
  { term: 'mmHg', def: 'Millimetres of mercury. A pressure unit used for blood pressure and for gases such as CO₂.' },
  { term: 'kPa', def: 'Kilopascal. A pressure unit used for cabin pressure.' },
  { term: 'µSv/h', def: 'Microsieverts per hour. How fast you are collecting radiation dose right now.' },
  { term: 'mSv', def: 'Millisieverts. Your total radiation dose so far. 1 mSv is 1000 µSv.' },
  { term: 'SpO₂', def: 'The percentage of your blood carrying oxygen.' },
  { term: 'ppO₂', def: 'Partial pressure of oxygen. The part of the cabin pressure that is oxygen.' },
  { term: 'Microgravity', def: 'The feeling of weightlessness in orbit or in deep space.' },
  { term: 'Fluid shift', def: 'In microgravity body fluids move toward your head, which can puff the face and stuff the nose.' },
  { term: 'Solar particle event', def: 'A burst of fast particles from the Sun that can raise radiation levels quickly.' },
  { term: 'SANS', def: 'Spaceflight-associated neuro-ocular syndrome. Eye and vision changes from fluid shift.' },
  { term: 'Diopter (D)', def: 'A unit of eyeglass strength. A larger plus number means more farsighted.' },
  { term: 'Baseline', def: 'Your own usual reading when you are well. Changes from your baseline matter most.' },
];

export const QUIZ = [
  { q: 'At rest, your SpO₂ reads 91 percent. What do you do first?', options: ['Ignore it, it is probably fine', 'Check the sensor fit and measure again', 'Skip dinner', 'Exercise to raise it'], answer: 1, explain: 'A poorly fitted sensor is the most common cause. Fix the fit, then measure again before you act on the number.' },
  { q: 'Why is daily exercise more important in microgravity?', options: ['It is more fun', 'Bones and muscles lose strength without load', 'It lowers cabin CO₂', 'It cools the cabin'], answer: 1, explain: 'Without gravity your skeleton and muscles are not loaded, so they weaken. Exercise supplies the load.' },
  { q: 'A solar storm alert appears. What should the crew do?', options: ['Go to the shielded shelter', 'Open the airlock', 'Carry on exercising', 'Switch off the sensors'], answer: 0, explain: 'The shelter has extra shielding and can cut your dose sharply.' },
  { q: 'Cabin CO₂ is rising and you have a mild headache. Best first step?', options: ['Drink coffee', 'Tell the crew and check the CO₂ scrubber', 'Go to sleep', 'Wait a week'], answer: 1, explain: 'A headache is an early sign of high CO₂. Fix the air, not the symptom.' },
  { q: 'Your heart rate reads 150 bpm while you sleep. What does that suggest?', options: ['Normal sleep', 'Something is wrong and you should check in', 'A good workout', 'The sensor is cold'], answer: 1, explain: 'Heart rate that high at rest is not normal. Wake up, rest and call the flight surgeon if it stays high.' },
  { q: 'Why measure at the same time each day?', options: ['It is easier to remember', 'Time of day changes readings, so trends compare fairly', 'The sensor needs it', 'It is a rule on Earth'], answer: 1, explain: 'Your body changes through the day. A fixed time removes that noise so real changes stand out.' },
  { q: 'Which tells you most about slow changes in your health?', options: ['One reading', 'The trend over days at the same time', 'A guess', 'The loudest alarm'], answer: 1, explain: 'Slow changes hide in single readings. A chart over days shows them.' },
  { q: 'Fine dust on a planet surface can cause:', options: ['Nothing', 'Eye and lung irritation', 'Higher gravity', 'Fever only'], answer: 1, explain: 'Dust is sharp and fine. Wipe suits before coming inside and report a cough or red eyes.' },
];
