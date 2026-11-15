import { GLOSSARY } from '../lib/education.js';
import { RESEARCH } from '../lib/research.js';

function Quiz({ quiz, onAnswer }) {
  const { question, answered } = quiz;
  return (
    <div className="quiz">
      <h3 className="sub">Question of the day</h3>
      <p>{question.q}</p>
      <div className="quiz-options" role="group" aria-label="Answers">
        {question.options.map((o, i) => {
          let cls = 'btn';
          if (answered) cls += i === question.answer ? ' right' : i === answered.choice ? ' wrong' : '';
          return (
            <button key={o} type="button" className={cls} disabled={Boolean(answered)} onClick={() => onAnswer(i)}>
              {o}
            </button>
          );
        })}
      </div>
      {answered && (
        <p className="msg" role="status">
          {answered.correct ? 'Correct. ' : 'Not quite. '}
          {question.explain}
        </p>
      )}
    </div>
  );
}

export default function LearnPanel({ profile, quiz, onAnswer }) {
  return (
    <section className="panel" aria-label="Learn">
      <header>
        <h2>Learn</h2>
        <p>{profile.name}: {profile.gravityLabel.toLowerCase()}</p>
      </header>
      <h3 className="sub">Risks where you are</h3>
      <ul className="hazards">
        {profile.hazards.map((h) => (
          <li key={h.title}>
            <h4>{h.title}</h4>
            <p>{h.text}</p>
          </li>
        ))}
      </ul>
      <h3 className="sub">Research library</h3>
      <p className="note">Each risk links to the NASA report behind it. Links open the NASA Technical Reports Server.</p>
      <div className="research">
        {RESEARCH.map((r) => (
          <details key={r.id} className="research-item">
            <summary>{r.risk}</summary>
            <ul>
              {r.papers.map((p) => (
                <li key={p.id}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer">{p.title}</a>
                  <span className="k"> {p.source}</span>
                  <p>{p.finding}</p>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
      <Quiz key={quiz.question.q} quiz={quiz} onAnswer={onAnswer} />
      <details className="glossary">
        <summary>Glossary</summary>
        <dl>
          {GLOSSARY.map((g) => (
            <div key={g.term}>
              <dt>{g.term}</dt>
              <dd>{g.def}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
