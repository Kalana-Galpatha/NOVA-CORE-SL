import { useEffect, useState } from 'react';
import { ENV_LIST } from './lib/environments.js';
import { formatMET } from './lib/format.js';
import { REAL_TIME } from './lib/constants.js';
import { useTelemetry } from './hooks/useTelemetry.js';
import { useSpaceWeather } from './hooks/useSpaceWeather.js';
import { useIssLive } from './hooks/useIssLive.js';
import MyHealth from './components/MyHealth.jsx';
import CrewConsole from './components/CrewConsole.jsx';
import ChatBot from './components/ChatBot.jsx';

export default function App() {
  const [view, setView] = useState('me');
  const [beginner, setBeginner] = useState(true);
  const [youId, setYouId] = useState('okafor');
  const tele = useTelemetry('spacecraft', youId);
  const sw = useSpaceWeather();
  const { world } = tele;
  const [issEnabled, setIssEnabledRaw] = useState(() => {
    try { return localStorage.getItem('crew_vitals_live_iss') === '1'; } catch { return false; }
  });
  const setIssEnabled = (on) => {
    setIssEnabledRaw(on);
    try { localStorage.setItem('crew_vitals_live_iss', on ? '1' : '0'); } catch { /* storage blocked */ }
  };
  const isStation = tele.envId === 'station';
  const iss = useIssLive(issEnabled && isStation);
  // Real ISS cabin readings replace the simulated cabin only in the Space station environment.
  useEffect(() => {
    world.sim.live = issEnabled && isStation ? iss.live : null;
  }, [world, iss.live, issEnabled, isStation]);
  const issProps = { iss, issEnabled, setIssEnabled, isStation, goStation: () => tele.changeEnv('station') };

  return (
    <>
      <header className="topbar">
        <div className="wrap bar-in">
          <div className="brand">
            <h1>Crew Vitals Console</h1>
            <p>{world.profile.name} · {world.profile.sub}</p>
          </div>
          <div className="met">
            <span className="k">Mission elapsed time</span>
            <b className="mono">{formatMET(world.snap.t)}</b>
            <span className="k">day / hh:mm</span>
          </div>
          <div className="ctl">
            <span className="sim">Simulated telemetry</span>
            <button type="button" className="btn" onClick={() => tele.setRunning(!tele.running)}>{tele.running ? 'Pause' : 'Resume'}</button>
            <div className="seg" role="group" aria-label="Simulation speed">
              {[REAL_TIME, 1, 5, 20].map((s) => (
                <button key={s} type="button" className="btn" aria-pressed={tele.speed === s} onClick={() => tele.setSpeed(s)}>{s === REAL_TIME ? 'Real time' : `${s * 60}×`}</button>
              ))}
            </div>
            <button type="button" className="btn" onClick={() => tele.skip(60)}>+1 hour</button>
          </div>
        </div>
        <div className="wrap bar-in sub-bar">
          <div className="seg" role="group" aria-label="Environment">
            {ENV_LIST.map((e) => (
              <button key={e.id} type="button" className="btn" aria-pressed={tele.envId === e.id} onClick={() => tele.changeEnv(e.id)} title={e.sub}>
                {e.name}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: world.profile.autonomous ? '#fb923c' : 'var(--muted, #94a3b8)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: world.profile.autonomous ? '#fb923c' : '#34d399', display: 'inline-block' }} />
            <span>{world.profile.autonomous ? 'Autonomous Mode' : 'Earth Ground Link'} ({world.profile.commsLabel})</span>
          </div>
          <div className="seg" role="group" aria-label="View">
            <button type="button" className="btn" aria-pressed={view === 'me'} onClick={() => setView('me')}>My health</button>
            <button type="button" className="btn" aria-pressed={view === 'console'} onClick={() => setView('console')}>Crew console</button>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={beginner} onChange={(ev) => setBeginner(ev.target.checked)} />
            Explain things for me
          </label>
        </div>
      </header>

      <main className="wrap">
        {view === 'me' ? (
          <MyHealth tele={tele} sw={sw} issProps={issProps} youId={youId} setYouId={setYouId} beginner={beginner} />
        ) : (
          <CrewConsole tele={tele} />
        )}
        <p className="disc">
          Crew vitals are simulated. Cabin oxygen and CO₂ limits follow NASA-STD-3001; all other limits are illustrative and must be replaced with the mission’s medical requirements before any real use.
          This tool supports crew and flight surgeon decisions. It does not diagnose.
        </p>
      </main>
      <ChatBot tele={tele} sw={sw} youId={youId} />
    </>
  );
}
