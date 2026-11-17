import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { analyzeProfile } from '../results.js';
import { friendlyError } from '../supabase.js';

export default function Analyzing() {
  const navigate = useNavigate();
  const started = useRef(false); // run only once (React StrictMode runs effects twice in dev)
  const [error, setError] = useState(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    analyzeProfile()
      .then((result) => navigate(`/results/${result.result_id}`, { replace: true }))
      .catch((e) => setError({ message: friendlyError(e), missing: e.missingQuestions }));
  }, [navigate]);

  if (error) {
    return (
      <div className="container narrow center">
        <h2>We couldn't analyze your profile</h2>
        <p className="error">{error.message}</p>
        {error.missing?.length > 0 ? (
          <>
            <p className="muted">Unanswered questions: {error.missing.join(', ')}</p>
            <Link className="btn" to={`/questionnaire/${error.missing[0]}`}>Go to question {error.missing[0]}</Link>
          </>
        ) : (
          <button className="btn" onClick={() => window.location.reload()}>Try again</button>
        )}
      </div>
    );
  }

  return (
    <div className="container narrow center analyzing">
      <div className="analyzing-art" aria-hidden="true">🔭</div>
      <div className="spinner" aria-hidden="true" />
      <h2>Analyzing your profile…</h2>
      <p className="muted">Matching your answers with 5 career fields and building your roadmap.</p>
    </div>
  );
}
