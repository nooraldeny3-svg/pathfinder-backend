import { Link } from 'react-router-dom';

// Radar chart order, matching the design: Creative on top, then clockwise.
const RADAR_ORDER = ['creative', 'people', 'data', 'tech', 'business'];

function Radar({ fields, scores }) {
  const size = 320;
  const c = size / 2;
  const r = 105;
  const items = RADAR_ORDER.map((code) => fields.find((f) => f.code === code)).filter(Boolean);
  const n = items.length;
  const point = (i, value) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [c + (r * value / 100) * Math.cos(angle), c + (r * value / 100) * Math.sin(angle)];
  };
  const polygon = (value) => items.map((_, i) => point(i, value).join(',')).join(' ');
  const dataPolygon = items.map((f, i) => point(i, scores[f.code] ?? 0).join(',')).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="radar" role="img" aria-label="Profile across 5 fields">
      {[100, 66, 33].map((v) => <polygon key={v} points={polygon(v)} className="radar-grid" />)}
      {items.map((_, i) => {
        const [x, y] = point(i, 100);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} className="radar-axis" />;
      })}
      <polygon points={dataPolygon} className="radar-data" />
      {items.map((f, i) => {
        const [x, y] = point(i, 125);
        return (
          <text key={f.code} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="radar-label">
            {f.short_label}
          </text>
        );
      })}
    </svg>
  );
}

// The results page content. Used by "Results" (with buttons) and "Share" (read only).
export default function ResultView({ result, fields, linkDetails = true }) {
  const scores = result.scores || {};
  const fieldOf = (code) => fields.find((f) => f.code === code);
  const breakdown = [...fields].sort((a, b) => (scores[b.code] ?? 0) - (scores[a.code] ?? 0));

  return (
    <>
      <div className="match-cards">
        {result.result_details.map((d) => (
          <div key={d.field_code} className="card match-card">
            <div className="match-head">
              <h3>{fieldOf(d.field_code)?.name}</h3>
              <span className="badge">{d.match_percent}%</span>
            </div>
            <div className="bar"><div style={{ width: `${d.match_percent}%` }} /></div>
            <p className="muted">{d.explanation}</p>
            {linkDetails && <Link to={`/results/${result.id}/${d.field_code}`} className="details-link">View details ›</Link>}
          </div>
        ))}
      </div>

      <div className="result-panels">
        <div className="card">
          <p className="eyebrow">Profile across 5 fields</p>
          <Radar fields={fields} scores={scores} />
        </div>
        <div className="card">
          <p className="eyebrow">Field breakdown</p>
          {breakdown.map((f) => (
            <div key={f.code} className="breakdown-row">
              <strong>{f.name}</strong>
              <div className="bar"><div style={{ width: `${scores[f.code] ?? 0}%` }} /></div>
              <span className="muted">{scores[f.code] ?? 0}%</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
