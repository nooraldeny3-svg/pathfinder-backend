import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { loadFields, loadMyResults } from '../results.js';
import { friendlyError } from '../supabase.js';

export default function MyResults() {
  const { user } = useAuth();
  const [results, setResults] = useState(null);
  const [fields, setFields] = useState([]);
  const [onlySaved, setOnlySaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([loadMyResults(user.id), loadFields()])
      .then(([r, f]) => {
        setResults(r);
        setFields(f);
      })
      .catch((e) => setError(friendlyError(e)));
  }, [user.id]);

  if (error) return <div className="container"><p className="error">{error}</p></div>;
  if (!results) return <div className="container"><p>Loading…</p></div>;

  const nameOf = (code) => fields.find((f) => f.code === code)?.name || code;
  const list = onlySaved ? results.filter((r) => r.is_saved) : results;

  return (
    <div className="container">
      <div className="page-head">
        <h1>My results</h1>
        <Link to="/start" className="btn">New questionnaire</Link>
      </div>

      {results.length === 0 ? (
        <div className="card center">
          <p>You don't have any results yet.</p>
          <Link to="/start" className="btn">Start the questionnaire</Link>
        </div>
      ) : (
        <>
          <label className="inline-check">
            <input type="checkbox" checked={onlySaved} onChange={(e) => setOnlySaved(e.target.checked)} />
            Show only saved results
          </label>
          {list.map((r) => (
            <Link key={r.id} to={`/results/${r.id}`} className="card history-row">
              <div>
                <strong>{new Date(r.created_at).toLocaleString()}</strong>
                {r.is_saved && <span className="tag">Saved</span>}
                <p className="muted">
                  {r.top_fields.map((code) => `${nameOf(code)} ${r.scores[code]}%`).join(' · ')}
                </p>
              </div>
              <span className="details-link">View ›</span>
            </Link>
          ))}
          {list.length === 0 && <p className="muted">No saved results yet.</p>}
        </>
      )}
    </div>
  );
}
