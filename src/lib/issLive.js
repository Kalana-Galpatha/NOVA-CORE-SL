// Real cabin telemetry from the International Space Station, via NASA's public ISS Live feed
// (Lightstreamer). No API key is needed. Item IDs come from the open ISS Live / ISS Mimic projects:
//   USLAB000058  LAB_PCA_Cabin_Pressure     USLAB000053  LAB_MCA_ppO2
//   USLAB000055  LAB_MCA_ppCO2              USLAB000054  LAB_MCA_ppN2
//   NODE3000001  Node_3_MCA_ppO2            NODE3000003  Node_3_MCA_ppCO2   (second module, used as backup)
// The feed does not publish units, so values are range-checked and converted defensively below.
// This is cabin atmosphere only. NASA does not publish astronaut biometrics, so vitals stay simulated.

export const ISS_SERVER = 'https://push.lightstreamer.com';
export const ISS_ADAPTER = 'ISSLIVE';
export const ISS_ITEMS = {
  USLAB000058: 'pressure',
  USLAB000053: 'ppo2',
  USLAB000055: 'co2',
  USLAB000054: 'ppn2',
  NODE3000001: 'n3ppo2',
  NODE3000003: 'n3co2',
};
export const ISS_STALE_MS = 10 * 60 * 1000; // values freeze during loss of signal, so old data is dropped

const PSI_TO_KPA = 6.894757;
const MMHG_TO_KPA = 0.133322;
const inRange = (v, lo, hi) => (Number.isFinite(v) && v >= lo && v <= hi ? v : null);

// Cabin pressure to kPa. The ISS reports about 14.7 psi, i.e. 101 kPa or 760 mmHg.
export function pressureToKpa(v) {
  if (!Number.isFinite(v)) return null;
  let kpa = v;
  if (v < 30) kpa = v * PSI_TO_KPA;
  else if (v >= 200) kpa = v * MMHG_TO_KPA;
  return inRange(kpa, 60, 120);
}

// Oxygen partial pressure to kPa (about 21 kPa, or about 160 mmHg).
export function ppo2ToKpa(v) {
  if (!Number.isFinite(v)) return null;
  return inRange(v > 40 ? v * MMHG_TO_KPA : v, 10, 40);
}

// CO2 partial pressure in mmHg, as NASA's major constituent analyzer reports it. Normal ISS values are about 2 to 5.
export function co2ToMmHg(v) {
  return inRange(v, 0, 15);
}

const CONVERT = { pressure: pressureToKpa, ppo2: ppo2ToKpa, co2: co2ToMmHg, n3ppo2: ppo2ToKpa, n3co2: co2ToMmHg, ppn2: (v) => (Number.isFinite(v) ? v : null) };

export function convert(key, raw) {
  return CONVERT[key] ? CONVERT[key](parseFloat(raw)) : null;
}

// Build what the simulator needs from the latest readings; null when nothing usable is fresh.
export function liveCabin(readings, now = Date.now()) {
  const fresh = (k) => (readings[k] && now - readings[k].at <= ISS_STALE_MS ? readings[k].value : null);
  // US Lab first; Node 3 covers for it when the Lab reading is missing or stale
  const out = { pressure: fresh('pressure'), ppo2: fresh('ppo2') ?? fresh('n3ppo2'), co2: fresh('co2') ?? fresh('n3co2') };
  return out.pressure == null && out.ppo2 == null && out.co2 == null ? null : out;
}

async function defaultLoader() {
  const mod = await import('lightstreamer-client-web/core');
  return { LightstreamerClient: mod.LightstreamerClient, Subscription: mod.Subscription };
}

// Subscribes to the feed. Returns a function that disconnects. `loader` is injectable for tests.
export function connectIssLive({ onReading, onStatus, loader = defaultLoader }) {
  let client = null;
  let closed = false;
  loader().then(({ LightstreamerClient, Subscription }) => {
    if (closed) return;
    client = new LightstreamerClient(ISS_SERVER, ISS_ADAPTER);
    client.addListener({ onStatusChange: (s) => onStatus?.(s) });
    const sub = new Subscription('MERGE', Object.keys(ISS_ITEMS), ['TimeStamp', 'Value']);
    sub.addListener({
      onItemUpdate: (u) => {
        const key = ISS_ITEMS[u.getItemName()];
        const value = key ? convert(key, u.getValue('Value')) : null;
        if (value != null) onReading(key, value, Date.now());
      },
    });
    client.subscribe(sub);
    client.connect();
  }).catch((err) => onStatus?.(`ERROR:${err.message}`));
  return () => {
    closed = true;
    try { client?.disconnect(); } catch { /* already closed */ }
  };
}

// Lightstreamer status text -> a simple state for the UI.
export function simpleStatus(raw = '') {
  if (raw.startsWith('ERROR')) return 'error';
  if (raw.startsWith('CONNECTED')) return 'live';
  if (raw === 'STALLED' || raw.startsWith('DISCONNECTED:WILL-RETRY')) return 'reconnecting';
  if (raw.startsWith('CONNECTING')) return 'connecting';
  return 'off';
}
