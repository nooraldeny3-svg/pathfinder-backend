import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { loadQuestionnaire, isAnswered } from '../questionnaire.js';
import { friendlyError } from '../supabase.js';

export default function Intro() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadQuestionnaire(user.id).then(setData).catch((e) => setError(friendlyError(e)));
  }, [user.id]);

  if (error) return <div className="container"><p className="error">{error}</p></div>;
  if (!data) return <div className="container"><p>Loading…</p></div>;

  const { sections, questions, answers } = data;
  const total = questions.length;
  // Continue from the first unanswered question (or start at 1).
  const next = questions.find((q) => !isAnswered(q, answers[q.id]));
  const answeredCount = questions.filter((q) => isAnswered(q, answers[q.id])).length;
  const startAt = next ? next.id : 1;

  return (
    <div className="container">
      <section className="intro">
        <div>
          <p className="eyebrow">Before you start</p>
          <h1>Four short sections, {total} questions</h1>
          <p className="lead">
            Tell us about your background, what you enjoy, how you work and what matters to you.
            Your answers are saved as you go, so you can stop and continue later.
          </p>
          <p className="muted">{total} questions{answeredCount > 0 ? ` · ${answeredCount} already answered` : ''}</p>
          <Link to={`/questionnaire/${startAt}`} className="btn">
            {answeredCount > 0 && next ? 'Continue' : 'Start'}
          </Link>
          {answeredCount === total && (
            <Link to="/analyzing" className="btn secondary" style={{ marginLeft: '0.5rem' }}>See results</Link>
          )}
        </div>
        <div className="section-grid">
          {sections.map((s, i) => (
            <div key={s.id} className="card section-card">
              <span className="step-circle">{i + 1}</span>
              <div>
                <strong>{s.title}</strong>
                <p className="muted small">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
