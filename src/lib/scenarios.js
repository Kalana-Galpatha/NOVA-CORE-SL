import { LIMITS, LEVELS } from './constants.js';
import { hrLevel, spo2Level, tempLevel, respLevel, sysLevel, hrvLevel, co2Level, pressureLevel, ppo2Level, doseLevel } from './status.js';
import { vitalLine } from './chatbot.js';

/**
 * What-if scenarios: "if my body temperature is 40 Celsius", "my SpO2 is 88", "BP 160/100".
 * Reads the metric and the number from the message, grades it with the app's own alert limits,
 * and returns causes, steps, monitoring and escalation criteria. Fully offline.
 * Decision support only. Limits are illustrative, as everywhere else in the app.
 */

// Order matters: specific names first ("blood pressure" before "pressure").
const METRICS = [
  ['bp', /blood pressure|\bbp\b|systolic/],
  ['spo2', /spo2|spo₂|oxygen sat|blood oxygen|o2 sat|saturation|oximeter/],
  ['ppo2', /ppo2|ppo₂|oxygen pressure|cabin oxygen|partial pressure of oxygen/],
  ['co2', /co2|co₂|carbon dioxide/],
  ['dose', /radiation|µsv|usv|dose rate/],
  ['pressure', /cabin pressure|hull pressure|\bkpa\b/],
  ['hrv', /\bhrv\b|variability|rmssd/],
  ['resp', /breathing rate|respiration|respiratory rate|resp rate|breaths? (per|a|\/)? ?min/],
  ['hr', /heart rate|pulse|heartbeat|\bbpm\b|\bhr\b/],
  ['temp', /temperature|\btemp\b|fever|body heat/],
];

// [min, max] a living person / working cabin could actually show. Outside it: probably a unit or sensor error.
const PLAUSIBLE = {
  temp: [25, 45], hr: [10, 300], spo2: [50, 100], bp: [50, 300], resp: [2, 80], hrv: [1, 300],
  co2: [0.3, 40], pressure: [30, 110], ppo2: [5, 30], dose: [0, 100000],
};
const UNITS = { temp: '°C', hr: 'bpm', spo2: '%', bp: 'mmHg systolic', resp: 'breaths/min', hrv: 'ms', co2: 'mmHg', pressure: 'kPa', ppo2: 'kPa', dose: 'µSv/h' };
const NAMES = {
  temp: 'Core temperature', hr: 'Heart rate', spo2: 'Blood oxygen (SpO₂)', bp: 'Blood pressure', resp: 'Breathing rate',
  hrv: 'Heart rate variability', co2: 'Cabin CO₂', pressure: 'Cabin pressure', ppo2: 'Cabin oxygen pressure (ppO₂)', dose: 'Radiation dose rate',
};
const CALL = ['Self-care is fine.', 'Monitor and log it.', 'Tell the medical officer today.', 'Contact the flight surgeon now.'];

// Extra low-side limits (watch, caution, warning) for indicators the alert engine only grades on the high side.
const LOW_LIMITS = { temp: [36.0, 35.5, 35.0], bp: [95, 90, 80], resp: [11, 9, 7] };
const lowLevel = (v, t) => t.reduce((l, x, i) => (v < x ? i + 1 : l), 0);

/** Grade a value: { level, dir } where dir is 'high' or 'low'. */
function grade(id, v, crew, act) {
  const lowT = LOW_LIMITS[id];
  if (lowT && lowLevel(v, lowT) > 0) return { level: lowLevel(v, lowT), dir: 'low' };
  switch (id) {
    case 'temp': return { level: tempLevel(v), dir: 'high' };
    case 'hr': return hrLevel(v, act, crew.max);
    case 'spo2': return { level: spo2Level(v), dir: 'low' };
    case 'bp': return { level: sysLevel(v), dir: 'high' };
    case 'resp': return { level: respLevel(v), dir: 'high' };
    case 'hrv': return { level: hrvLevel(v), dir: 'low' };
    case 'co2': return { level: co2Level(v), dir: 'high' };
    case 'pressure': return { level: pressureLevel(v), dir: 'low' };
    case 'ppo2': return { level: ppo2Level(v), dir: 'low' };
    default: return { level: doseLevel(v), dir: 'high' };
  }
}

const ALERT_LIMITS = (id, dir) => {
  const f = (a) => a.map((x) => (id === 'temp' ? x.toFixed(1) : x)).join(' / ');
  if (id === 'hr') return null; // depends on activity
  if (dir === 'low' && LOW_LIMITS[id]) return f(LOW_LIMITS[id]);
  const key = { temp: 'temp', spo2: 'spo2', bp: 'sys', resp: 'resp', hrv: 'hrv', co2: 'co2', pressure: 'pressure', ppo2: 'ppo2', dose: 'dose' }[id];
  return LIMITS[key] ? f(LIMITS[key]) : null;
};

const P = {
  'temp.high': {
    meaning: ['', 'Slightly raised: low-grade fever or heat from effort.', 'Fever range. Treat it and tell the medical team today.', 'High fever or possible heat illness. This is urgent.'],
    causes: 'Infection or a latent virus waking up (spaceflight dampens the immune system), exercise heat (in microgravity sweat clings to the skin and does not evaporate), dehydration, a cabin cooling or airflow fault, a medication reaction, or a faulty patch.',
    steps: {
      1: ['Rest and stop hard exercise. Sip about 250 mL of water.', 'Confirm with the oral thermometer after 10 minutes. Do not rely on the patch alone.', 'Check cabin temperature and airflow.', 'Log any chills, aches, sore throat, cough or rash.'],
      2: ['Stop work and exercise. Remove extra layers and increase airflow over your body (a fan matters most, because sweat will not evaporate on its own).', 'Cool with damp cloths on the neck, armpits and groin.', 'Drink small sips of water or the oral rehydration drink every 10 to 15 minutes.', 'Use a fever reducer from the medical kit only as its label or the flight surgeon directs. Never exceed the label dose.', 'Tell the medical officer and flight surgeon. If infection is possible, wear a mask, sleep apart and wipe shared surfaces.'],
      3: ['Stop everything and tell a crewmate and the medical officer NOW. Do not stay alone.', 'Start active cooling immediately: strip to light clothing, maximum airflow over the body, cold damp cloths on neck, armpits and groin, and a cold pack in those spots if the kit has one.', 'Drink small frequent sips of water or rehydration drink only if you are alert and can swallow safely.', 'Fever reducer from the medical kit only as the flight surgeon or kit protocol directs. It helps fever but is not enough for heat illness.', 'Confirm with the oral thermometer. Treat the high reading as real until proven otherwise.'],
    },
    monitor: 'Temperature every 15 minutes (cooling goal: under 38.5 °C). Pulse, breathing rate, SpO₂ and blood pressure every 15 minutes. Log fluid intake.',
    escalate: 'confusion or odd behaviour, fainting, seizure, severe headache, stiff neck, hot dry skin with no sweating, fast breathing, uncontrolled vomiting, a new rash, SpO₂ below 93 %, or a temperature that keeps rising or does not fall within 30 minutes of cooling.',
  },
  'temp.low': {
    meaning: ['', 'Slightly low. Often a cold cabin or a loose sensor.', 'Low body temperature. Warm up and check for a cause.', 'Dangerously low body temperature. Treat as urgent.'],
    causes: 'A cold cabin or sleeping area, damp clothing, low food intake, illness, or a patch that is not touching the skin.',
    steps: {
      1: ['Add dry layers or zip into the sleeping bag. Have a warm drink.', 'Retake with the oral thermometer to confirm.', 'Check the cabin temperature setting.'],
      2: ['Replace any damp clothing and insulate, including head, hands and feet.', 'Warm (not hot) drinks and some food.', 'Raise the cabin temperature if you can. Confirm with the oral thermometer and tell the medical officer.'],
      3: ['Tell a crewmate and the medical officer NOW and do not stay alone.', 'Wrap in dry insulation including the head. Warm the trunk first. Do not use very hot surfaces.', 'Keep still (no hard exercise to warm up). Warm sweet drinks only if fully alert.', 'Contact the flight surgeon and check cabin temperature and the thermal control system.'],
    },
    monitor: 'Temperature every 15 minutes until above 36.5 °C, plus pulse and breathing.',
    escalate: 'confusion, slurred speech, drowsiness, shivering that stops, a very slow pulse or slow breathing.',
  },
  'hr.high': {
    meaning: ['', 'Raised for what you are doing.', 'Clearly high for what you are doing.', 'Very high for what you are doing. Treat as urgent.'],
    causes: 'Exercise or stress, dehydration, fever, high cabin CO₂, caffeine, sleep debt, an irregular rhythm (PVCs, tachycardia) or a faulty sensor.',
    steps: {
      1: ['Sit quietly for 5 minutes with slow breathing (4 seconds in, 6 out) and sip water.', 'Take a manual pulse for 30 seconds and double it.', 'Check the cabin CO₂ reading.'],
      2: ['Stop exertion. Check cabin CO₂ and temperature, and take your temperature.', 'Take a manual pulse twice and note if it is regular or irregular.', 'Hydrate and rest. Tell the medical officer.', 'Avoid caffeine and strenuous tasks until it settles.'],
      3: ['Stop everything, secure yourself and sit. Tell a crewmate and the medical officer NOW.', 'Attach the 1-lead ECG sensor and transmit the rhythm strip to the flight surgeon.', 'Check SpO₂, blood pressure, temperature and the cabin CO₂ and oxygen readings.', 'Do not do any EVA, docking or heavy work.'],
    },
    monitor: 'Manual pulse and heart rate every 10 to 15 minutes until it is back in range at rest.',
    escalate: 'chest pain or pressure, fainting or near-fainting, shortness of breath, an irregular or pounding pulse, or a rate that stays high at rest after 15 minutes.',
  },
  'hr.low': {
    meaning: ['', 'Lower than expected for what you are doing.', 'Clearly low. Check how you feel.', 'Very low. Treat as urgent.'],
    causes: 'Deep rest or fitness (normal if you feel well), medication, a vagal response, low oxygen, or a sensor fault.',
    steps: {
      1: ['If you feel well and were resting, note it and recheck in 15 minutes.', 'Take a manual pulse to confirm the patch.'],
      2: ['Sit or secure yourself in a stable position. Rise slowly.', 'Take a manual pulse and check for dizziness, weakness or breathlessness.', 'Check SpO₂ and the cabin oxygen readings. Tell the medical officer.'],
      3: ['Stop work, secure yourself and tell a crewmate and the medical officer NOW.', 'Check SpO₂, blood pressure and breathing. Attach the 1-lead ECG sensor and transmit the strip to the flight surgeon.', 'No EVA, docking or heavy work.'],
    },
    monitor: 'Manual pulse every 10 to 15 minutes, with SpO₂ and blood pressure.',
    escalate: 'fainting or near-fainting, chest pain, confusion, new breathlessness, or a pulse that keeps falling.',
  },
  'spo2.low': {
    meaning: ['', 'Slightly low. Often sensor fit.', 'Low blood oxygen. Find the cause now.', 'Very low blood oxygen. This is urgent.'],
    causes: 'A loose or cold sensor, high cabin CO₂, falling cabin oxygen or pressure (a leak or generator fault), poor ventilation around your head, or an illness affecting the lungs.',
    steps: {
      1: ['Reseat the sensor on a warm finger or patch site and recheck after a minute.', 'Take 10 slow deep breaths.', 'Recheck with the backup pulse oximeter.'],
      2: ['Sit upright and breathe slowly and deeply. Stop exertion.', 'Check cabin ppO₂, CO₂ and pressure. Move to fresh airflow.', 'Confirm with the backup oximeter. If confirmed, consider supplemental oxygen as the protocol directs.', 'Tell the medical officer.'],
      3: ['Put on the oxygen mask and start supplemental oxygen NOW. Tell a crewmate and the medical officer.', 'Check the cabin atmosphere (ppO₂, CO₂, pressure) for a leak or generator fault, and alert the crew if the cabin is the cause.', 'Stop all exertion. Sit upright.', 'Contact the flight surgeon.'],
    },
    monitor: 'SpO₂, pulse and breathing rate every 5 to 10 minutes. Recheck cabin atmosphere every 15 minutes.',
    escalate: 'bluish lips, confusion, chest pain, severe shortness of breath, or no improvement within 10 minutes of oxygen.',
  },
  'bp.high': {
    meaning: ['', 'Mildly raised.', 'Clearly high. Recheck and report.', 'Very high. Treat as urgent.'],
    causes: 'Stress, salty space food, caffeine, poor sleep, pain, fluid shifts, a wrong cuff fit or arm position.',
    steps: {
      1: ['Rest 5 minutes with the arm at heart height, then measure again.', 'Cut back on salty foods and caffeine today.'],
      2: ['Rest, then measure twice, 5 minutes apart. Note the average.', 'Hydrate. Check sleep debt, stress and any pain.', 'Tell the medical officer today.'],
      3: ['Stop exertion and rest. Tell a crewmate and the medical officer NOW.', 'Re-measure after 5 minutes with correct cuff fit and arm position.', 'Contact the flight surgeon. Do not do EVA or heavy work.'],
    },
    monitor: 'Blood pressure and pulse every 15 minutes while above range, then twice a day.',
    escalate: 'severe headache, chest pain, vision change, confusion, weakness or numbness, or shortness of breath.',
  },
  'bp.low': {
    meaning: ['', 'Slightly low.', 'Low. Risk of dizziness and fainting.', 'Very low. Treat as urgent.'],
    causes: 'Dehydration, fluid shifts and cardiovascular deconditioning, blood loss, fever, or a wrong cuff fit.',
    steps: {
      1: ['Drink 500 mL of water and have a salty snack. Move slowly.'],
      2: ['Secure yourself lying down or reclined. Drink fluids with some salt.', 'Move slowly and avoid sudden position changes.', 'Tell the medical officer today.'],
      3: ['Lie down secured and tell a crewmate and the medical officer NOW.', 'Check pulse, SpO₂ and temperature. Look for bleeding or severe vomiting and diarrhea.', 'Contact the flight surgeon.'],
    },
    monitor: 'Blood pressure and pulse every 10 to 15 minutes.',
    escalate: 'fainting, confusion, cold clammy skin, a very fast pulse, chest pain or any bleeding.',
  },
  'resp.high': {
    meaning: ['', 'Slightly fast.', 'Fast breathing. Check the air first.', 'Very fast breathing. Treat as urgent.'],
    causes: 'High cabin CO₂ (the most common cause here), exertion, anxiety, fever, or low oxygen.',
    steps: {
      1: ['Sit upright and breathe slowly (4 seconds in, 6 out).', 'Check the cabin CO₂ reading.'],
      2: ['Stop exertion and move to fresh airflow. Check CO₂, ppO₂ and pressure.', 'Check SpO₂ and temperature. Tell the medical officer.'],
      3: ['Put on the oxygen mask. Tell a crewmate and the medical officer NOW.', 'Check the cabin atmosphere for CO₂ or leak problems and alert the crew if needed.', 'Contact the flight surgeon.'],
    },
    monitor: 'Breathing rate and SpO₂ every 5 to 10 minutes.',
    escalate: 'chest pain, blue lips, confusion, SpO₂ below 93 %, or no improvement in 10 minutes.',
  },
  'resp.low': {
    meaning: ['', 'Slightly slow.', 'Slow breathing. Check alertness.', 'Very slow breathing. Treat as urgent.'],
    causes: 'Deep sleep or relaxation (normal if alert), sedating medication, or a serious problem if the person is hard to wake.',
    steps: {
      1: ['If you are awake and feel well, note it and recheck in 15 minutes.'],
      2: ['Make sure you are fully alert. Check SpO₂ and pulse and ask a crewmate to watch you.', 'Review recent medication. Tell the medical officer.'],
      3: ['Call a crewmate and the medical officer NOW. If the person is hard to wake, treat it as an emergency.', 'Check airway, breathing and SpO₂. Give oxygen if SpO₂ is low.', 'Contact the flight surgeon.'],
    },
    monitor: 'Breathing rate, SpO₂ and alertness every 5 to 10 minutes.',
    escalate: 'drowsiness, confusion, blue lips, or hard to wake.',
  },
  'hrv.low': {
    meaning: ['', 'A little low.', 'Low. Your body is under load.', 'Very low. Look for a cause and report it.'],
    causes: 'Stress, sleep debt, heavy workload, illness starting, dehydration, or deconditioning. HRV often falls before other signs.',
    steps: {
      1: ['Sit quietly and breathe rhythmically for 5 minutes.', 'Hydrate and keep your sleep window.'],
      2: ['Rest, breathe rhythmically, hydrate and reduce workload where you can.', 'Check sleep debt and stress trends. Take your temperature.'],
      3: ['Rest and reduce all non-essential work. Check temperature, pulse, SpO₂ and cabin CO₂.', 'Tell the medical officer and the flight surgeon.'],
    },
    monitor: 'HRV and pulse at the same time each day. Retest after a full night of sleep.',
    escalate: 'it stays below 25 ms for several days, or comes with fever, palpitations or fainting.',
  },
  'co2.high': {
    meaning: ['', 'Slightly raised cabin CO₂.', 'High cabin CO₂. Act on the scrubber.', 'Dangerous cabin CO₂. Act now.'],
    causes: 'A scrubber or fan fault, too many people or too much exertion in one module, or poor airflow so a pocket forms around your head.',
    steps: {
      1: ['Move to fresh airflow and check the scrubber and fan status.', 'Limit hard exercise.'],
      2: ['Switch to the backup CO₂ removal unit and check scrubber bed and fans.', 'Limit exertion and move crew to the best-ventilated module.', 'Expect headache and tiredness. Tell the medical officer.'],
      3: ['Alert the crew. Use the backup CO₂ removal and move everyone to the cleanest module.', 'Wear an emergency mask if the protocol calls for it.', 'Stop exertion. Contact the flight surgeon.'],
    },
    monitor: 'CO₂ every 5 minutes until under 4 mmHg. Check crew for headache, breathlessness and drowsiness.',
    escalate: 'severe headache, vomiting, confusion, fainting, or CO₂ that keeps rising.',
  },
  'pressure.low': {
    meaning: ['', 'Cabin pressure slightly low.', 'Cabin pressure clearly low. A leak is likely.', 'Cabin pressure dangerously low.'],
    causes: 'A hull, hatch or seal leak, a venting valve left open, or a pressure control fault.',
    steps: {
      1: ['Watch the trend for 5 minutes to see if it keeps falling.', 'Walk the hatch and seal list.'],
      2: ['Alert the crew. Walk the hatch and seal list and find the leak.', 'Close off the affected module and start reserve gas makeup.'],
      3: ['Sound the alarm and move the crew to the safe module. Close the hatch to the leaking module.', 'Start reserve gas makeup and put on oxygen masks or suits per protocol.', 'Contact mission control.'],
    },
    monitor: 'Pressure and ppO₂ every minute. Check crew for ear pain or breathlessness.',
    escalate: 'ear pain, breathlessness, a continuing fall in pressure, or a hissing sound.',
  },
  'ppo2.low': {
    meaning: ['', 'Cabin oxygen slightly low.', 'Cabin oxygen low.', 'Cabin oxygen dangerously low.'],
    causes: 'An oxygen generator fault, a leak, or too much nitrogen added.',
    steps: {
      1: ['Confirm the oxygen generator is running and recheck.'],
      2: ['Add reserve oxygen and confirm generator output.', 'Limit exertion and check crew for headache and breathlessness.'],
      3: ['Alert the crew. Put on oxygen masks and add reserve oxygen NOW.', 'Check for a pressure leak. Contact mission control.'],
    },
    monitor: 'ppO₂ every 5 minutes until 20 kPa or more.',
    escalate: 'breathlessness, confusion, blue lips, or a falling ppO₂ despite added oxygen.',
  },
  'dose.high': {
    meaning: ['', 'Radiation rate above background.', 'High radiation rate.', 'Very high radiation rate: likely a solar particle event.'],
    causes: 'A solar particle event (solar storm), passing through a radiation belt or anomaly, or a shielding change.',
    steps: {
      1: ['Check the space weather alert and the dose trend.', 'Plan work for low-radiation periods.'],
      2: ['Prepare to move to the storm shelter and finish outside tasks.', 'Log the dose.'],
      3: ['Move all crew to the storm shelter NOW and stay until the rate is under 150 µSv/h.', 'Suspend EVA. Log the dose and tell the flight surgeon.'],
    },
    monitor: 'Dose rate every 5 minutes and cumulative dose against the mission budget.',
    escalate: 'nausea, vomiting or skin redness after a high dose, or a rate that keeps rising.',
  },
};

function activityFrom(q, fallback) {
  if (/\b(exercis|workout|running|treadmill|cardio|lifting|training|after (a )?run)/.test(q)) return 'exercise';
  if (/\b(sleep|sleeping|asleep|nap)\b/.test(q)) return 'sleep';
  if (/\b(rest|resting|sitting|idle|calm)\b/.test(q)) return 'work';
  return fallback;
}

function readNumber(id, q) {
  // Drop metric names that contain digits (CO2, SpO2, O2) so they are not read as values.
  const t = q.replace(/spo2|spo₂|ppo2|ppo₂|co2|co₂|\bo2\b/g, ' ');
  if (id === 'bp') {
    const m = t.match(/(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})/);
    if (m) return { v: Number(m[1]), dia: Number(m[2]) };
  }
  const m = t.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  let v = Number(m[1]);
  const after = t.slice(m.index + m[0].length, m.index + m[0].length + 14);
  if (id === 'temp') {
    const f = /^\s*(°|º|degrees?)?\s*(f\b|fahrenheit)/.test(after);
    if (f || (v > 45 && v <= 115 && !/^\s*(°|º|degrees?)?\s*(c\b|celsius|centigrade)/.test(after))) v = Math.round(((v - 32) * 5) / 9 * 10) / 10;
  }
  return { v };
}

/** Returns a reply object for a what-if or stated-value message, or null if the message is not one. */
export function scenarioReply(question, ctx) {
  const q = String(question || '').toLowerCase();
  if (!/\d/.test(q)) return null;
  const hit = METRICS.find(([, re]) => re.test(q));
  if (!hit) return null;
  const id = hit[0];
  const num = readNumber(id, q);
  if (!num) return null;
  const { v } = num;
  const c = ctx.snap.crew.find((x) => x.id === ctx.youId);
  const hypo = /\b(if|what if|suppose|supposing|assume|imagine|say|let'?s say|would)\b/.test(q);
  const label = NAMES[id];
  const unitTxt = UNITS[id];
  const shown = id === 'bp' && num.dia ? `${v}/${num.dia} mmHg` : `${id === 'temp' || !Number.isInteger(v) ? v.toFixed(1) : v} ${unitTxt}`;
  const [lo, hi] = PLAUSIBLE[id];
  if (v < lo || v > hi) {
    return { text: `${label} of ${shown} is outside what is physically plausible${id === 'spo2' && v > 100 ? ' (SpO₂ cannot exceed 100 %)' : ''}. Check the units and the sensor, retake the reading, and tell me the new value.`, level: 1, source: 'scenario', chips: ['How am I doing?'] };
  }

  const act = activityFrom(q, c?.act === 'sleep' || c?.act === 'exercise' ? 'work' : (c?.act || 'work'));
  const { level, dir } = grade(id, v, c, act);
  const head = `${hypo ? 'What-if: ' : 'Reading: '}${label} ${shown}`;
  const actNote = id === 'hr' ? ` (assuming you are ${act === 'exercise' ? 'exercising' : act === 'sleep' ? 'sleeping' : 'resting or on duty'})` : '';
  const lim = ALERT_LIMITS(id, dir);
  const limitTxt = lim ? ` Alert limits (${dir === 'low' ? 'below' : 'above'}): watch / caution / warning = ${lim} ${unitTxt === 'mmHg systolic' ? 'mmHg' : unitTxt}.` : '';

  const live = vitalLine(id, c, ctx.snap.env);
  const liveTxt = live ? `\n\nYour live ${label.toLowerCase()} right now: ${live.value}, ${LEVELS[live.level].toLowerCase()}.${hypo ? ' A what-if does not change your real status.' : ''}` : '';

  if (level === 0) {
    return {
      text: `${head}${actNote}\n\nAssessment: NOMINAL. This is inside the usual range, so no action is needed.${limitTxt}\n\nKeep routine monitoring. If you feel unwell even though the number looks fine, tell the medical officer. The sensor can be wrong.${liveTxt}\n\nDecision support, not a diagnosis.`,
      level: 0, source: 'scenario', chips: ['How am I doing?', 'Any active alerts?'],
    };
  }

  const pro = P[`${id}.${dir}`];
  const comms = level >= 2
    ? (ctx.profile?.autonomous
      ? `You are in autonomous mode, so follow these onboard steps now without waiting for Earth, and brief the flight surgeon as the link allows. Earth link delay: ${ctx.profile.commsLabel}.`
      : `Contact the flight surgeon now. Earth link: ${ctx.profile?.commsLabel || 'available'}.`)
    : '';
  const extra = id === 'temp' && dir === 'high' && v >= 40.5 ? ' At or above 40.5 °C this is in the heat stroke range, so cooling must start immediately.' : '';
  const steps = pro.steps[level].map((s, i) => `${i + 1}. ${s}`).join('\n');
  const text = [
    `${head}${actNote}`,
    `Assessment: ${LEVELS[level].toUpperCase()} (level ${level}). ${CALL[level]} ${pro.meaning[level]}${extra}${limitTxt}`,
    comms,
    `Likely causes: ${pro.causes}`,
    `What to do:\n${steps}`,
    `Keep monitoring: ${pro.monitor}`,
    `Escalate immediately if you get: ${pro.escalate}`,
  ].filter(Boolean).join('\n\n') + `${liveTxt}\n\nDecision support, not a diagnosis.`;
  return { text, level, source: 'scenario', chips: ['How am I doing?', 'Any active alerts?', 'I have a headache'] };
}

// Shared with reasoning.js (the "why and what to do" layer for questions without a number).
export { P as PROTOCOLS, METRICS, NAMES, UNITS, CALL, ALERT_LIMITS, grade };
