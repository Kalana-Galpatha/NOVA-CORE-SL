// Where each piece of data comes from, with links. Keeps the live / simulated / reference split honest.
const SOURCES = [
  {
    group: 'Live data used in this app',
    items: [
      { id: 'iss', name: 'ISS Live telemetry', what: 'Real cabin pressure, oxygen and CO₂ from the International Space Station. Drives the Space station environment when switched on.', url: 'https://demos.lightstreamer.com/ISSLive/', link: 'ISS Live demo' },
      { name: 'wheretheiss.at ISS position', what: 'Live station position and orbit track on the map in the Space station environment. A free public service, not run by NASA.', url: 'https://wheretheiss.at/w/developer', link: 'wheretheiss.at' },
      { id: 'donki', name: 'NASA DONKI space weather', what: 'Solar flares, particle events and geomagnetic storms in the Space weather panel and chatbot.', url: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/', link: 'DONKI' },
      { id: 'nasaapi', name: 'NASA Open APIs', what: 'Free API keys and documentation for DONKI and other NASA services.', url: 'https://api.nasa.gov', link: 'api.nasa.gov' },
    ],
  },
  {
    group: 'Open projects built on the same feeds',
    items: [
      { name: 'ISS Mimic', what: 'Open-source project that uses the ISS telemetry feed; useful for finding more data items.', url: 'https://iss-mimic.github.io/Mimic/', link: 'ISS Mimic' },
      { name: 'Lightstreamer ISS Live client', what: 'Example client code for the ISS Live feed.', url: 'https://github.com/Lightstreamer/Lightstreamer-example-ISSLive-client-javascript', link: 'GitHub' },
    ],
  },
  {
    group: 'Research the simulation is based on (not loaded as data)',
    items: [
      { name: 'NASA Human Research Program', what: 'Risks of spaceflight to human health: bone, vision, radiation, behavior. Behind the alerts and advice.', url: 'https://www.nasa.gov/hrp/', link: 'NASA HRP' },
      { name: 'NASA-STD-3001 (crew health standard)', what: 'Source of the cabin oxygen and CO₂ alert limits: PIO₂ ranges (Table 6.2-1), one-hour CO₂ average of 3 mmHg, total pressure range.', url: 'https://standards.nasa.gov/standard/NASA/NASA-STD-3001-VOL-2', link: 'NASA Standards' },
      { name: 'NASA Technical Reports Server', what: 'Free NASA research papers on spaceflight medicine and physiology.', url: 'https://ntrs.nasa.gov', link: 'NTRS' },
      { name: 'NASA Open Science Data Repository', what: 'Space biology and human research datasets for further study.', url: 'https://osdr.nasa.gov', link: 'OSDR' },
    ],
  },
];

export default function DataSources({ iss, issEnabled, sw }) {
  const status = {
    iss: !issEnabled ? 'Off' : iss.live ? 'Live' : iss.stale ? 'No fresh data' : 'Connecting…',
    donki: sw?.status === 'ok' ? 'Live' : sw?.status === 'stale' ? 'Saved copy' : sw?.status === 'error' ? 'Unavailable' : 'Loading…',
  };
  return (
    <section className="panel" aria-label="Data sources">
      <header>
        <h2>Data sources and resources</h2>
        <p>What is real, what is simulated, and where to read more.</p>
      </header>
      <p className="note" style={{ marginBottom: 12 }}>
        Simulated: all crew vitals, radiation dose, the other cabin environments, routines and long-term trends. Cabin oxygen and CO₂ alert limits follow NASA-STD-3001; other limits are illustrative.
      </p>
      {SOURCES.map((g) => (
        <div key={g.group} style={{ marginBottom: 14 }}>
          <h3 className="k" style={{ margin: '0 0 6px' }}>{g.group}</h3>
          <ul className="sw-list">
            {g.items.map((s) => (
              <li key={s.name}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{s.name}</b>
                  {status[s.id] && <span className="pill" style={{ marginLeft: 8 }} data-lv={status[s.id] === 'Live' ? 0 : 'n'}><i aria-hidden="true" /><em>{status[s.id]}</em></span>}
                  <div className="note" style={{ marginTop: 2 }}>{s.what}</div>
                </div>
                <a href={s.url} target="_blank" rel="noreferrer">{s.link} ↗</a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
