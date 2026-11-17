import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import QuestionInput from '../components/QuestionInput.jsx';
import { emptyValue, isAnswered, isComplete, loadQuestionnaire, saveAnswer } from '../questionnaire.js';
import { friendlyError } from '../supabase.js';

export default function Questionnaire() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const n = Number(useParams().number);

  const [data, setData] = useState(null); // { sections, questions, answers }
  // The answer being edited, remembered together with the question it belongs to.
  // (Storing the question id prevents showing question 3's answer on question 4.)
  const [draft, setDraftState] = useState({ qid: null, value: null });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Load questions + saved answers once.
  useEffect(() => {
    loadQuestionnaire(user.id).then(setData).catch((e) => setError(friendlyError(e)));
  }, [user.id]);

  const q = data?.questions.find((x) => x.id === n);

  // Moving to another question: clear the error and any unsaved change.
  useEffect(() => {
    setError('');
    setDraftState({ qid: null, value: null });
  }, [n]);

  if (error && !data) return <div className="container"><p className="error">{error}</p></div>;
  if (!data) return <div className="container"><p>Loading…</p></div>;
  if (!q) return <Navigate to="/questionnaire/1" replace />;

  const { sections, questions, answers } = data;
  const total = questions.length;
  const isLast = n === total;
  const section = sections.find((s) => s.id === q.section_id);

  // Current answer: what the user changed on THIS question, otherwise the saved answer, otherwise empty.
  const saved = answers[q.id];
  const value = draft.qid === q.id ? draft.value : saved !== undefined && saved !== null ? saved : emptyValue(q);
  const setDraft = (v) => setDraftState({ qid: q.id, value: v });

  const save = async (value) => {
    setBusy(true);
    setError('');
    try {
      await saveAnswer(user.id, q.id, value);
      setData((d) => ({ ...d, answers: { ...d.answers, [q.id]: value } }));
      navigate(isLast ? '/analyzing' : `/questionnaire/${n + 1}`);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleNext = () => {
    if (!isComplete(q, value)) {
      setError(q.type === 'most_least'
        ? 'Pick at least one MOST and one LEAST.'
        : q.type === 'ranking'
          ? `Pick your top ${q.settings?.count || 3} in order.`
          : 'Please answer this question first.');
      return;
    }
    save(q.type === 'text' ? (value || '').trim() || null : value);
  };

  const handleBack = () => navigate(n > 1 ? `/questionnaire/${n - 1}` : '/start');

  return (
    <div className="container questionnaire">
      <aside className="progress-side">
        <p className="eyebrow">Your progress</p>
        {sections.map((s, i) => {
          const qs = questions.filter((x) => x.section_id === s.id);
          const done = qs.every((x) => isAnswered(x, answers[x.id]));
          const active = s.id === q.section_id;
          return (
            <div key={s.id} className={`side-step ${active ? 'active' : ''}`}>
              <span className="step-circle">{done && !active ? '✓' : i + 1}</span>
              {s.title}
            </div>
          );
        })}
      </aside>

      <section className="question">
        <div className="progress">
          <div className="bar"><div style={{ width: `${(n / total) * 100}%` }} /></div>
          <span className="muted small">Question {n} of {total}</span>
        </div>

        <p className="eyebrow">{n}. {q.label || section?.title}</p>
        <h1>{q.title}</h1>
        {q.subtitle && <p className="muted">{q.subtitle}</p>}

        <QuestionInput q={q} value={value} onChange={(v) => { setDraft(v); setError(''); }} />

        {q.type === 'text' && (
          <button type="button" className="link skip" disabled={busy} onClick={() => save(null)}>Skip</button>
        )}

        {error && <p className="error">{error}</p>}

        <div className="q-buttons">
          <button type="button" className="btn outline" onClick={handleBack} disabled={busy}>Back</button>
          <button type="button" className="btn" onClick={handleNext} disabled={busy}>
            {busy ? 'Saving…' : isLast ? 'See results' : 'Next'}
          </button>
        </div>
      </section>
    </div>
  );
}
