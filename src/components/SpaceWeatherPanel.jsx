import { useState } from 'react';
import StatusPill from './StatusPill.jsx';
import { getNasaApiKey, hasCustomNasaKey, setNasaApiKey } from '../lib/nasa.js';

const ICON = { flare: '☀️', sep: '☢️', storm: '🧲', cme: '🌀' };
const when = (ms) => new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// Real solar activity from NASA DONKI. The rest of the console is simulated; this panel is live.
export default function SpaceWeatherPanel({ sw, onSimulateStorm }) {
  const { status, events, summary, fetchedAt, error, refresh } = sw;
  const [custom, setCustom] = useState(hasCustomNasaKey());
  const [draft, setDraft] = useState('');
  const saveKey = (ev) => {
    ev.preventDefault();
    setNasaApiKey(draft);
    setCustom(hasCustomNasaKey());
    setDraft('');
    refresh();
  };
  const clearKey = () => {
    setNasaApiKey('');
    setCustom(hasCustomNasaKey());
  };
  return (
    <section className="panel" aria-label="Space weather from NASA">
      <header>
        <h2>Space weather <span className="k">(live, NASA DONKI)</span></h2>
        {summary && <StatusPill level={summary.level} />}
      </header>

      {status === 'loading' && <p className="note">Contacting NASA…</p>}

      {summary && <p>{summary.text}</p>}

      {events.length > 0 && (
        <ul className="sw-list">
          {events.slice(0, 6).map((e) => (
            <li key={e.id} data-lv={e.severity}>
              <span aria-hidden="true">{ICON[e.type]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{e.label}</b> <span className="mono">{when(e.time)}{e.time > Date.now() ? ' (expected)' : ''}</span>
                <div className="note" style={{ marginTop: 0 }}>{e.detail}</div>
              </div>
              <StatusPill level={e.severity} />
            </li>
          ))}
        </ul>
      )}

      {(status === 'error' || status === 'stale') && (
        <p className="note" role="status">
          {status === 'stale' ? 'Showing saved data. ' : ''}Could not refresh from NASA: {error}
        </p>
      )}
      {custom ? (
        <p className="note">
          Using your NASA API key ({getNasaApiKey().slice(0, 4)}…).{' '}
          <button type="button" className="btn sm" onClick={clearKey}>Remove key</button>
        </p>
      ) : (
        <form onSubmit={saveKey} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '8px' }}>
          <label className="note" htmlFor="nasa-key" style={{ margin: 0 }}>NASA API key (shared DEMO_KEY is rate limited):</label>
          <input id="nasa-key" type="password" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Paste your key from api.nasa.gov" style={{ flex: 1, minWidth: '200px' }} autoComplete="off" />
          <button type="submit" className="btn sm primary" disabled={!draft.trim()}>Save key</button>
        </form>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
        <button type="button" className="btn sm" onClick={refresh}>Refresh</button>
        <button type="button" className="btn sm" onClick={onSimulateStorm} title="Starts a simulated solar particle event so you can practise the storm-shelter response">
          Practise a storm in the simulator
        </button>
      </div>
      <p className="note">
        {fetchedAt ? `Updated ${when(fetchedAt)}. ` : ''}The cabin dose rate above is still simulated and is not driven by these events. Real data is shown for situational awareness.
      </p>
    </section>
  );
}
