import { BADGES } from '../lib/tasks.js';
import { formatMET } from '../lib/format.js';

function Ring({ done, total }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const share = total ? done / total : 0;
  return (
    <svg className="ring" viewBox="0 0 88 88" role="img" aria-label={`${done} of ${total} tasks done today`}>
      <circle cx="44" cy="44" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
      <circle
        cx="44" cy="44" r={r} fill="none" stroke="var(--accent)" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${c * share} ${c}`} transform="rotate(-90 44 44)"
      />
      <text x="44" y="49" textAnchor="middle" fontSize="18" fontWeight="600" fill="var(--fg)">{done}/{total}</text>
    </svg>
  );
}

export default function GamePanel({ progress, view, board, team, feed, youId }) {
  const earned = new Set(progress.badges);
  const mine = feed.filter((f) => f.crew === youId).slice(0, 5);
  return (
    <section className="panel" aria-label="Progress and rewards">
      <header>
        <h2>Your progress</h2>
        <p>Simulated crew history</p>
      </header>

      <div className="game-top">
        <Ring done={view.doneCount} total={view.total} />
        <div className="game-stats">
          <p className="level mono">Level {progress.level}</p>
          <div className="xpbar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.into} aria-label="XP to next level">
            <i style={{ width: `${progress.into}%` }} />
          </div>
          <p className="k">{progress.xp} XP · {100 - progress.into} to level {progress.level + 1}</p>
          <p className="streak"><b className="mono">{progress.streak}</b> day streak <span className="k">(best {progress.bestStreak})</span></p>
        </div>
      </div>

      <h3 className="sub">Badges</h3>
      <ul className="badges">
        {BADGES.map((b) => (
          <li key={b.id} className={earned.has(b.id) ? 'badge on' : 'badge'}>
            <b>{b.name}</b>
            <span>{earned.has(b.id) ? 'Earned' : b.text}</span>
          </li>
        ))}
      </ul>

      <h3 className="sub">Crew today</h3>
      <div className="xpbar team" role="progressbar" aria-valuemin={0} aria-valuemax={team.total} aria-valuenow={team.done} aria-label="Crew tasks done today">
        <i style={{ width: `${team.total ? (team.done / team.total) * 100 : 0}%` }} />
      </div>
      <p className="k">Crew goal: finish every task today. {team.done} of {team.total} done.</p>
      <ol className="board">
        {board.map((r, i) => (
          <li key={r.id} className={r.id === youId ? 'me' : ''}>
            <span className="rank mono">{i + 1}</span>
            <span className="who">{r.name}{r.id === youId ? ' (you)' : ''}</span>
            <span className="mono">L{r.level}</span>
            <span className="mono">{r.xp} XP</span>
            <span className="mono">{r.streak}d</span>
          </li>
        ))}
      </ol>

      {mine.length > 0 && (
        <>
          <h3 className="sub">Recent</h3>
          <ul className="feed">
            {mine.map((f) => (
              <li key={`${f.t}-${f.text}`}><time className="mono">{formatMET(f.t)}</time> {f.text}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
