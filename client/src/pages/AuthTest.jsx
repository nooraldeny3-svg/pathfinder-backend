import { useState } from 'react';

// Developer page for trying the auth endpoints and inspecting raw responses.
// Uses fetch directly (not api.js) so status codes and headers are visible
// and the app's stored login is left untouched.
const FORMS = {
  register: {
    label: 'Register',
    path: '/auth/register',
    fields: [
      { name: 'fullName', label: 'Full name' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'password', label: 'Password', type: 'password' },
    ],
  },
  login: {
    label: 'Login',
    path: '/auth/login',
    fields: [
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'password', label: 'Password', type: 'password' },
    ],
  },
};

async function send(method, path, { body, token } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const started = performance.now();
  const res = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return {
    request: `${method} /api${path}`,
    status: res.status,
    statusText: res.statusText,
    ms: Math.round(performance.now() - started),
    retryAfter: res.headers.get('Retry-After'),
    body: data,
  };
}

export default function AuthTest() {
  const [mode, setMode] = useState('register');
  const [values, setValues] = useState({ fullName: '', email: '', password: '' });
  const [token, setToken] = useState('');
  const [response, setResponse] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    try {
      const result = await fn();
      setResponse(result);
      if (result.body?.token) setToken(result.body.token);
    } catch (err) {
      setResponse({ error: `Could not reach the server: ${err.message}` });
    } finally {
      setBusy(false);
    }
  };

  const form = FORMS[mode];
  const handleSubmit = (e) => {
    e.preventDefault();
    const body = Object.fromEntries(form.fields.map((f) => [f.name, values[f.name]]));
    run(() => send('POST', form.path, { body }));
  };

  const ok = response?.status >= 200 && response?.status < 300;

  return (
    <div className="container">
      <h1>Auth test</h1>
      <p className="muted">Try register / login against the API and see the raw response.</p>

      <div className="row">
        <div>
          <div className="card">
            <div className="chips" style={{ marginBottom: '1rem' }}>
              {Object.entries(FORMS).map(([key, f]) => (
                <button key={key} type="button" className={`chip ${mode === key ? 'active' : ''}`} onClick={() => setMode(key)}>
                  {f.label}
                </button>
              ))}
            </div>
            {/* noValidate so invalid input reaches the server and its 400 responses can be inspected */}
            <form className="form" onSubmit={handleSubmit} noValidate>
              {form.fields.map((f) => (
                <label key={f.name}>
                  {f.label}
                  <input
                    type={f.type || 'text'}
                    value={values[f.name]}
                    onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                  />
                </label>
              ))}
              <button className="btn" disabled={busy}>{busy ? 'Sending…' : `Send ${form.label}`}</button>
            </form>
          </div>

          <div className="card form">
            <h3>Token</h3>
            <textarea
              className="token"
              rows={4}
              placeholder="Filled automatically after a successful register / login"
              value={token}
              onChange={(e) => setToken(e.target.value.trim())}
            />
            <div className="chips">
              <button type="button" className="btn small" disabled={busy} onClick={() => run(() => send('GET', '/auth/me', { token }))}>
                GET /auth/me
              </button>
              <button type="button" className="btn small secondary" disabled={busy || !token} onClick={() => setToken('')}>
                Clear token
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Response</h3>
          {!response && <p className="muted">Send a request to see the response here.</p>}
          {response?.error && <p className="error">{response.error}</p>}
          {response?.status && (
            <>
              <p>
                <code>{response.request}</code>
                <br />
                <span className={`status ${ok ? 'ok' : 'fail'}`}>{response.status} {response.statusText}</span>
                <span className="muted"> · {response.ms} ms</span>
                {response.retryAfter && <span className="muted"> · Retry-After: {response.retryAfter}s</span>}
              </p>
              <pre className="json">{JSON.stringify(response.body, null, 2)}</pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
