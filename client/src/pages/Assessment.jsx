import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const LEVELS = ['Not rated', 'Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert'];
const MIN_SKILLS = 3;

export default function Assessment() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [major, setMajor] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [interests, setInterests] = useState([]);
  const [levels, setLevels] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api('/skills'), api('/interests'), api('/majors'), api('/profile')])
      .then(([s, i, m, p]) => {
        setCatalog({ skills: s.skills, interests: i.interests, majors: m.majors });
        const a = p.assessment;
        setMajor(a.major || '');
        setGraduationYear(a.graduationYear || '');
        setInterests(a.interests);
        setLevels(Object.fromEntries(a.skills.map((sk) => [sk.skillId, sk.level])));
      })
      .catch((err) => setError(err.message));
  }, []);

  const skillsByCategory = useMemo(() => {
    const groups = {};
    for (const s of catalog?.skills || []) (groups[s.category] ||= []).push(s);
    return groups;
  }, [catalog]);

  const ratedCount = Object.values(levels).filter((l) => l > 0).length;

  const toggleInterest = (id) =>
    setInterests((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!interests.length) return setError('Pick at least one career interest.');
    if (ratedCount < MIN_SKILLS) return setError(`Rate at least ${MIN_SKILLS} skills so we can compare your profile.`);

    setBusy(true);
    try {
      const skills = Object.entries(levels)
        .filter(([, level]) => level > 0)
        .map(([skillId, level]) => ({ skillId: Number(skillId), level }));
      await api('/profile', { method: 'PUT', body: { major, graduationYear: graduationYear || null, interests, skills } });
      await api('/recommendations', { method: 'POST' });
      navigate('/results');
    } catch (err) {
      setError(err.details ? `${err.message} Missing: ${[].concat(err.details).join(', ')}` : err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!catalog) return <div className="container">{error ? <p className="error">{error}</p> : <p>Loading…</p>}</div>;

  return (
    <div className="container">
      <h1>Career assessment</h1>
      <p className="muted">Tell us about your education, interests and skills. It takes about 5 minutes.</p>
      <form onSubmit={handleSubmit} className="assessment">
        <section className="card">
          <h2>1. Education</h2>
          <div className="row">
            <label>
              Major
              <input list="majors" required value={major} onChange={(e) => setMajor(e.target.value)} placeholder="e.g. Computer Engineering" />
              <datalist id="majors">{catalog.majors.map((m) => <option key={m} value={m} />)}</datalist>
            </label>
            <label>
              Graduation year
              <input type="number" min="1950" max="2100" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} />
            </label>
          </div>
        </section>

        <section className="card">
          <h2>2. Career interests</h2>
          <div className="chips">
            {catalog.interests.map((i) => (
              <button
                type="button"
                key={i.id}
                className={`chip ${interests.includes(i.id) ? 'active' : ''}`}
                aria-pressed={interests.includes(i.id)}
                onClick={() => toggleInterest(i.id)}
              >
                {i.label}
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>3. Skills <span className="muted">({ratedCount} rated)</span></h2>
          {Object.entries(skillsByCategory).map(([category, skills]) => (
            <div key={category} className="skill-group">
              <h3>{category}</h3>
              {skills.map((s) => (
                <label key={s.id} className="skill-row">
                  <span>{s.name}</span>
                  <select value={levels[s.id] || 0} onChange={(e) => setLevels({ ...levels, [s.id]: Number(e.target.value) })}>
                    {LEVELS.map((label, lvl) => <option key={lvl} value={lvl}>{lvl ? `${lvl} – ${label}` : label}</option>)}
                  </select>
                </label>
              ))}
            </div>
          ))}
        </section>

        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Analyzing your profile…' : 'Get my career recommendations'}</button>
      </form>
    </div>
  );
}
