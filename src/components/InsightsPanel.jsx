import StatusPill from './StatusPill.jsx';

export default function InsightsPanel({ insights }) {
  return (
    <section className="panel" aria-label="Health insights">
      <header>
        <h2>Health insights</h2>
        <p>What your numbers mean today</p>
      </header>
      <ul className="insights">
        {insights.map((i) => (
          <li key={i.id} data-lv={i.level}>
            <div className="insight-head">
              <h3>{i.title}</h3>
              {i.level > 0 && <StatusPill level={i.level} />}
            </div>
            <p>{i.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
