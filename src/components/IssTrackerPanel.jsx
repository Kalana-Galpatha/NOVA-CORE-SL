import { useMemo } from 'react';
import StatusPill from './StatusPill.jsx';
import { useIssPosition } from '../hooks/useIssPosition.js';
import { WORLD_PATH } from '../lib/worldPath.js';
import { footprintEllipse, project, trackSegments, VISIBILITY_TEXT } from '../lib/issTrack.js';

const fmtLat = (v) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? 'N' : 'S'}`;
const fmtLon = (v) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? 'E' : 'W'}`;

// Live ground track of the station. Shown for the Space station environment.
export default function IssTrackerPanel({ active }) {
  const { pos, track, error, status } = useIssPosition(active);
  const nowSec = pos?.t ?? Math.floor(Date.now() / 1000);
  const segs = useMemo(() => trackSegments(track, nowSec), [track, nowSec]);
  const [x, y] = pos ? project(pos.lon, pos.lat) : [0, 0];
  const fp = pos ? footprintEllipse(pos) : null;

  return (
    <section className="panel" aria-label="ISS position">
      <header>
        <h2>Where is the station? <span className="k">(live position, orbit track)</span></h2>
        <StatusPill level={status === 'live' ? 0 : status === 'error' ? 2 : 1} label={status === 'live' ? 'Live' : status === 'error' ? 'Position unavailable' : 'Loading…'} />
      </header>

      <svg viewBox="0 0 360 180" className="iss-map" role="img"
        aria-label={pos ? `Map showing the station over ${fmtLat(pos.lat)}, ${fmtLon(pos.lon)}` : 'World map'}>
        <rect width="360" height="180" className="iss-sea" />
        {[-60, -30, 0, 30, 60].map((lat) => <line key={lat} x1="0" x2="360" y1={90 - lat} y2={90 - lat} className="iss-grid" />)}
        {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => <line key={lon} y1="0" y2="180" x1={lon + 180} x2={lon + 180} className="iss-grid" />)}
        <path d={WORLD_PATH} className="iss-land" />
        {segs.map((s, i) => <path key={i} d={s.d} className={s.past ? 'iss-past' : 'iss-future'} fill="none" />)}
        {pos && (
          <g>
            <ellipse cx={x} cy={y} rx={fp.rx} ry={fp.ry} className="iss-foot" />
            <circle cx={x} cy={y} r="3.2" className="iss-dot" />
          </g>
        )}
      </svg>

      {pos && (
        <table className="iss-table">
          <tbody>
            <tr><th scope="row">Over</th><td className="mono">{fmtLat(pos.lat)}, {fmtLon(pos.lon)}</td></tr>
            <tr><th scope="row">Altitude</th><td className="mono">{pos.altKm.toFixed(0)} km</td></tr>
            <tr><th scope="row">Speed</th><td className="mono">{Math.round(pos.speedKmh).toLocaleString()} km/h</td></tr>
            <tr><th scope="row">Lighting</th><td>{VISIBILITY_TEXT[pos.visibility] ?? pos.visibility}</td></tr>
          </tbody>
        </table>
      )}
      {error && <p className="note" role="status">Could not refresh the position: {error}.{pos ? ' Showing the last known position.' : ''}</p>}
      <p className="note">
        Solid line: path ahead (about 1.5 hours). Dashed line: the last 30 minutes. The shaded oval is the area that can see the station. Position data from <a href="https://wheretheiss.at/w/developer" target="_blank" rel="noreferrer">wheretheiss.at</a>, a free public service built on NASA/NORAD orbital data. It is not run by NASA and needs no key.
      </p>
    </section>
  );
}
