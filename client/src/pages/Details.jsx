import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { loadFields, loadResult, saveResult } from '../results.js';
import { friendlyError } from '../supabase.js';

export default function Details() {
  const { user } = useAuth();
  const { resultId, fieldCode } = useParams();
  const [result, setResult] = useState(null);
  const [field, setField] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([loadResult({ resultId, userId: user.id }), loadFields()])
      .then(([r, fields]) => {
        if (!r) throw new Error('Result not found');
        setResult(r);
        setSaved(r.is_saved);
        setField(fields.find((f) => f.code === fieldCode) || null);
      })
      .catch((e) => setError(friendlyError(e)));
  }, [resultId, fieldCode, user.id]);

  if (error) return <div className="container"><p className="error">{error}</p></div>;
  if (!result) return <div className="container"><p>Loading…</p></div>;

  const detail = result.result_details.find((d) => d.field_code === fieldCode);
  if (!detail || !field) {
    return (
      <div className="container">
        <p className="error">These details are not available.</p>
        <Link to={`/results/${resultId}`}>← Back to results</Link>
      </div>
    );
  }

  const target = detail.skill_gaps[0]?.target ?? 80;

  const handleSave = async () => {
    try {
      await saveResult(result.id);
      setSaved(true);
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  return (
    <div className="container">
      <Link to={`/results/${resultId}`} className="back-link">← Back to results</Link>
      <div className="page-head">
        <h1>{field.name}</h1>
        <span className="badge">{detail.match_percent}% match</span>
      </div>
      <div className="card explanation">{detail.explanation}</div>

      <div className="details-grid">
        <div>
          <p className="eyebrow">Careers</p>
          <div className="chips">
            {field.careers.map((c) => <span key={c.title} className="chip active">{c.title}</span>)}
          </div>

          <p className="eyebrow">Work environments</p>
          <div className="chips">
            {field.work_environments.map((w) => <span key={w.name} className="chip active">{w.name}</span>)}
          </div>

          <p className="eyebrow">Roadmap (6 / 9 / 12 months)</p>
          <ol className="timeline">
            {detail.roadmap.map((s, i) => (
              <li key={s.months}>
                <span className="step-circle">{i + 1}</span>
                <div>
                  <strong>{s.months} months</strong>
                  <p className="muted">{s.step}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <div className="card">
            <p className="eyebrow">Your skill gap (target {target}%)</p>
            {detail.skill_gaps.map((g) => (
              <div key={g.skill} className="gap-row">
                <div className="gap-head">
                  <strong>{g.skill}</strong>
                  <span className="muted small">{g.current}% → {g.target}%</span>
                </div>
                <div className="bar gap-bar">
                  <div style={{ width: `${g.current}%` }} />
                  <span className="target-mark" style={{ left: `${g.target}%` }} />
                </div>
              </div>
            ))}
          </div>
          <button className="btn wide" onClick={handleSave} disabled={saved}>
            {saved ? 'Saved to my profile ✓' : 'Save to my profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
