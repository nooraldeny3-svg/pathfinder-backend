import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ResultView from '../components/ResultView.jsx';
import { loadFields, loadSharedResult } from '../results.js';
import { friendlyError } from '../supabase.js';

// Public page opened from a Share link: /share/<share_id>
export default function Share() {
  const { shareId } = useParams();
  const [result, setResult] = useState(undefined);
  const [fields, setFields] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([loadSharedResult(shareId), loadFields()])
      .then(([r, f]) => {
        setResult(r);
        setFields(f);
      })
      .catch((e) => setError(friendlyError(e)));
  }, [shareId]);

  if (error) return <div className="container"><p className="error">{error}</p></div>;
  if (result === undefined) return <div className="container"><p>Loading…</p></div>;
  if (result === null) return <div className="container"><p>This shared result was not found.</p></div>;

  return (
    <div className="container">
      <h1>Shared career matches</h1>
      <p className="muted small">Created with PathFinder AI on {new Date(result.created_at).toLocaleDateString()}</p>
      <ResultView result={result} fields={fields} linkDetails={false} />
      <div className="center">
        <Link to="/register" className="btn">Find your own career path</Link>
      </div>
    </div>
  );
}
