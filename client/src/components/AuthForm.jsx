import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function AuthForm({ title, fields, submitLabel, onSubmit, footer }) {
  const navigate = useNavigate();
  const [values, setValues] = useState(Object.fromEntries(fields.map((f) => [f.name, ''])));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSubmit(values);
      navigate('/assessment');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container narrow">
      <form className="card form" onSubmit={handleSubmit}>
        <h2>{title}</h2>
        {fields.map((f) => (
          <label key={f.name}>
            {f.label}
            <input
              type={f.type || 'text'}
              required
              minLength={f.minLength}
              autoComplete={f.autoComplete}
              value={values[f.name]}
              onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
            />
          </label>
        ))}
        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Please wait…' : submitLabel}</button>
        <p className="muted">{footer.text} <Link to={footer.to}>{footer.link}</Link></p>
      </form>
    </div>
  );
}
