import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import ResultView from '../components/ResultView.jsx';
import { loadFields, loadResult, saveResult, shareLink } from '../results.js';
import { friendlyError } from '../supabase.js';

export default function Results() {
  const { user } = useAuth();
  const { resultId } = useParams();
  const [result, setResult] = useState(undefined); // undefined = loading, null = none
  const [fields, setFields] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setResult(undefined);
    Promise.all([loadResult({ resultId, userId: user.id }), loadFields()])
      .then(([r, f]) => {
        setResult(r);
        setFields(f);
      })
      .catch((e) => setError(friendlyError(e)));
  }, [resultId, user.id]);

  if (error) return <div className="container"><p className="error">{error}</p></div>;
  if (result === undefined) return <div className="container"><p>Loading…</p></div>;
  if (result === null) {
    return (
      <div className="container narrow center">
        <h2>No results yet</h2>
        <p className="muted">Answer the questionnaire to see your top career matches.</p>
        <Link to="/start" className="btn">Start the questionnaire</Link>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      await saveResult(result.id);
      setResult({ ...result, is_saved: true });
      setMessage('Saved to your profile ✓');
    } catch (e) {
      setMessage(friendlyError(e));
    }
  };

  const handleShare = async () => {
    const link = shareLink(result.share_id);
    try {
      await navigator.clipboard.writeText(link);
      setMessage('Share link copied ✓');
    } catch {
      window.prompt('Copy this link:', link);
    }
  };

  return (
    <div className="container">
      <div className="page-head">
        <h1>Your top matches</h1>
        <div className="head-buttons">
          <button className="btn outline" onClick={handleShare}>Share</button>
          <button className="btn" onClick={handleSave} disabled={result.is_saved}>
            {result.is_saved ? 'Saved ✓' : 'Save results'}
          </button>
        </div>
      </div>
      {message && <p className="notice">{message}</p>}
      <p className="muted small">Results from {new Date(result.created_at).toLocaleString()}</p>

      <ResultView result={result} fields={fields} />

      <div className="center">
        <Link to="/start" className="btn outline">← Back to start</Link>
      </div>
    </div>
  );
}
