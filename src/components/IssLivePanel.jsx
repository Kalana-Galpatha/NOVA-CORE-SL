import StatusPill from './StatusPill.jsx';

const STATUS_TEXT = {
  off: 'Off',
  connecting: 'Connecting to NASA…',
  live: 'Connected',
  reconnecting: 'Reconnecting…',
  error: 'Could not connect',
};
const ago = (ms) => {
  if (!ms) return 'no data yet';
  const s = Math.round((Date.now() - ms) / 1000);
  return s < 90 ? `${s}s ago` : `${Math.round(s / 60)} min ago`;
};

// Real cabin atmosphere from the ISS. Everything else in the console stays simulated.
export default function IssLivePanel({ iss, enabled, setEnabled, isStation, onGoStation }) {
  const r = iss.readings;
  const rows = [
    ['Cabin pressure (US Lab)', r.pressure, 'kPa', 1],
    ['Oxygen ppO₂ (US Lab)', r.ppo2, 'kPa', 1],
    ['Carbon dioxide ppCO₂ (US Lab)', r.co2, 'mmHg', 2],
    ['Oxygen ppO₂ (Node 3)', r.n3ppo2, 'kPa', 1],
    ['Carbon dioxide ppCO₂ (Node 3)', r.n3co2, 'mmHg', 2],
  ];
  const level = !enabled ? 'n' : iss.stale || iss.status === 'error' ? 2 : iss.status === 'live' && iss.live ? 0 : 1;
  const label = !enabled ? 'Off' : iss.stale ? 'No fresh data' : iss.live ? 'Live' : STATUS_TEXT[iss.status];

  return (
    <section className="panel" aria-label="Live ISS cabin data">
      <header>
        <h2>Live ISS cabin data <span className="k">(NASA ISS Live)</span></h2>
        <StatusPill level={level} label={label} />
      </header>

      <label className="toggle" style={{ marginBottom: 8 }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Use real International Space Station cabin data
      </label>

      {!isStation && enabled && (
        <p className="note" role="status">
          Real data drives the <b>Space station</b> environment only.{' '}
          <button type="button" className="btn sm" onClick={onGoStation}>Switch to Space station</button>
        </p>
      )}

      {enabled && (
        <>
          <table className="iss-table">
            <tbody>
              {rows.map(([name, v, unit, d]) => (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  <td className="mono">{v ? `${v.value.toFixed(d)} ${unit}` : '—'}</td>
                  <td className="note">{v ? ago(v.at) : 'waiting'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="note">
            Status: {STATUS_TEXT[iss.status]} · last update {ago(iss.lastAt)}. If a US Lab reading is missing, the Node 3 reading is used instead. The station goes out of contact now and then, and the values freeze until the signal returns. Readings older than 10 minutes are ignored and the simulator takes over.
          </p>
        </>
      )}

      <p className="note">
        While on, the cabin air in the Space station environment (pressure, ppO₂, CO₂) and its alerts use these real values, and simulated cabin faults (scrubber, leak) have no effect on them. Crew vitals and radiation stay simulated, because NASA does not publish astronaut health data.
        {' '}Source: <a href="https://demos.lightstreamer.com/ISSLive/" target="_blank" rel="noreferrer">ISS Live</a>.
      </p>
    </section>
  );
}
