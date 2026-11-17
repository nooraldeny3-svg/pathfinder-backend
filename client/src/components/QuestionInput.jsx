// One component per question type. Each gets the question, the current value
// and onChange(newValue). Values are saved exactly in the format the backend expects
// (see docs/API.md): always the option CODE, never the label.

const SCALE = [1, 2, 3, 4, 5];

// Safety: always work with the right shape, even if an unexpected value arrives.
const asArray = (v) => (Array.isArray(v) ? v : []);
const asObject = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

function Dropdown({ q, value, onChange }) {
  const placeholder = q.code === 'study_field' ? 'Choose your field of study' : 'Choose an option';
  return (
    <select value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{placeholder}</option>
      {q.options.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
    </select>
  );
}

function SingleChoice({ q, value, onChange }) {
  return (
    <div className="options">
      {q.options.map((o) => (
        <button
          type="button"
          key={o.code}
          className={`option ${value === o.code ? 'active' : ''}`}
          aria-pressed={value === o.code}
          onClick={() => onChange(o.code)}
        >
          <span className="dot" />
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ScaleButtons({ value, onChange, label }) {
  return (
    <div className="scale" role="radiogroup" aria-label={label}>
      {SCALE.map((n) => (
        <button
          type="button"
          key={n}
          className={`circle ${value === n ? 'active' : ''}`}
          aria-checked={value === n}
          role="radio"
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function RatingGrid({ q, value, onChange }) {
  const v = asObject(value);
  return (
    <div className="options">
      {q.options.map((o) => (
        <div key={o.code} className="option static rating-row">
          <strong>{o.label}</strong>
          <ScaleButtons label={o.label} value={v[o.code]} onChange={(n) => onChange({ ...v, [o.code]: n })} />
        </div>
      ))}
    </div>
  );
}

function MultiSelect({ q, value, onChange }) {
  const v = asArray(value);
  const toggle = (code) => onChange(v.includes(code) ? v.filter((c) => c !== code) : [...v, code]);
  return (
    <div className="options two-col">
      {q.options.map((o) => (
        <button
          type="button"
          key={o.code}
          className={`option ${v.includes(o.code) ? 'active' : ''}`}
          aria-pressed={v.includes(o.code)}
          onClick={() => toggle(o.code)}
        >
          <span className="box">{v.includes(o.code) ? '✓' : ''}</span>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Scale({ q, value, onChange }) {
  value = typeof value === 'number' ? value : null;
  return (
    <div className="option static scale-card">
      <ScaleButtons label={q.title} value={value} onChange={onChange} />
      <div className="scale-labels muted">
        <span>1 = {q.settings?.min_label || 'Not at all'}</span>
        <span>5 = {q.settings?.max_label || 'A lot'}</span>
      </div>
    </div>
  );
}

function MostLeast({ q, value, onChange }) {
  const v = asObject(value);
  const most = asArray(v.most);
  const least = asArray(v.least);
  // A statement can't be both MOST and LEAST.
  const setMost = (code) => onChange({
    most: most.includes(code) ? most.filter((c) => c !== code) : [...most, code],
    least: least.filter((c) => c !== code),
  });
  const setLeast = (code) => onChange({
    most: most.filter((c) => c !== code),
    least: least.includes(code) ? least.filter((c) => c !== code) : [...least, code],
  });
  return (
    <div className="options">
      <div className="ml-head muted"><span>MOST like me</span><span>LEAST like me</span></div>
      {q.options.map((o) => (
        <div key={o.code} className="option static ml-row">
          <span>{o.label}</span>
          <span className="ml-buttons">
            <button type="button" className={`pill ${most.includes(o.code) ? 'most' : ''}`} onClick={() => setMost(o.code)}>Most</button>
            <button type="button" className={`pill ${least.includes(o.code) ? 'least' : ''}`} onClick={() => setLeast(o.code)}>Least</button>
          </span>
        </div>
      ))}
    </div>
  );
}

function Ranking({ q, value, onChange }) {
  const v = asArray(value);
  const count = q.settings?.count || 3;
  const click = (code) => {
    if (v.includes(code)) onChange(v.filter((c) => c !== code));
    else if (v.length < count) onChange([...v, code]);
  };
  return (
    <div className="options two-col">
      {q.options.map((o) => {
        const rank = v.indexOf(o.code) + 1;
        return (
          <button
            type="button"
            key={o.code}
            className={`option ${rank ? 'active' : ''}`}
            onClick={() => click(o.code)}
            disabled={!rank && v.length >= count}
          >
            <span className={`rank-num ${rank ? 'on' : ''}`}>{rank || ''}</span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function TextAnswer({ q, value, onChange }) {
  return (
    <textarea
      className="text-answer"
      rows={4}
      maxLength={q.settings?.max_length || 300}
      placeholder="Type one sentence (optional)"
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

const COMPONENTS = {
  dropdown: Dropdown,
  single_choice: SingleChoice,
  rating_grid: RatingGrid,
  multi_select: MultiSelect,
  scale: Scale,
  most_least: MostLeast,
  ranking: Ranking,
  text: TextAnswer,
};

export default function QuestionInput({ q, value, onChange }) {
  const Component = COMPONENTS[q.type];
  if (!Component) return <p className="error">Unknown question type: {q.type}</p>;
  return <Component q={q} value={value} onChange={onChange} />;
}
