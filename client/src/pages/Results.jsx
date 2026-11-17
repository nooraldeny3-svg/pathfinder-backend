import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

function Feedback({ recommendationId, careerId }) {
  const [rating, setRating] = useState(0);
  const [status, setStatus] = useState('');

  const rate = async (value) => {
    setRating(value);
    try {
      await api(`/recommendations/${recommendationId}/feedback`, { method: 'POST', body: { careerId, rating: value } });
      setStatus('Thanks!');
    } catch {
      setStatus('Could not save your rating.');
    }
  };

  return (
    <div className="feedback">
      <span className="muted">Was this helpful?</span>
      {[1, 2, 3, 4, 5].map((v) => (
        <button key={v} type="button" className={`star ${v <= rating ? 'on' : ''}`} onClick={() => rate(v)} aria-label={`Rate ${v} out of 5`}>★</button>
      ))}
      {status && <span className="muted">{status}</span>}
    </div>
  );
}

export default function Results() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/recommendations/latest')
      .then(setResult)
      .catch((err) => setError(err.status === 404 ? 'none' : err.message));
  }, []);

  if (error === 'none') {
    return (
      <div className="container">
        <p>You don't have recommendations yet.</p>
        <Link to="/assessment" className="btn">Take the assessment</Link>
      </div>
    );
  }
  if (error) return <div className="container"><p className="error">{error}</p></div>;
  if (!result) return <div className="container"><p>Loading…</p></div>;

  return (
    <div className="container">
      <h1>Your recommended careers</h1>
      <p className="muted">
        Generated {new Date(result.createdAt).toLocaleString()} by the {result.source === 'ai' ? 'AI' : 'rule-based'} engine.
        Recommendations are guidance — validate them with mentors and career services.
      </p>
      {result.notice && <p className="notice">{result.notice}</p>}

      {result.recommendations.map((r, idx) => (
        <article key={r.careerId} className="card career">
          <header>
            <div>
              <span className="rank">#{idx + 1}</span>
              <h2>{r.title}</h2>
              <span className="tag">{r.field}</span>
            </div>
            <div className="score" title="Match score">
              <strong>{r.score}%</strong>
              <div className="bar"><div style={{ width: `${r.score}%` }} /></div>
            </div>
          </header>
          <p>{r.description}</p>
          <p><strong>Why it fits:</strong> {r.explanation}</p>
          {r.matchedSkills.length > 0 && (
            <p className="matched">{r.matchedSkills.map((s) => <span key={s} className="chip active small">{s}</span>)}</p>
          )}
          {r.roadmap.length > 0 ? (
            <>
              <h3>Skill roadmap</h3>
              <ol className="roadmap">
                {r.roadmap.map((step) => (
                  <li key={step.skill}>
                    <span className={`priority ${step.priority}`}>{step.priority}</span>
                    <strong>{step.skill}</strong>
                    {step.targetLevel && <span className="muted"> (level {step.currentLevel} → {step.targetLevel})</span>}
                    <div>{step.step}</div>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="muted">You already meet the expected skill levels for this role.</p>
          )}
          <Feedback recommendationId={result.id} careerId={r.careerId} />
        </article>
      ))}
      <Link to="/assessment" className="btn secondary">Update my assessment</Link>
    </div>
  );
}
