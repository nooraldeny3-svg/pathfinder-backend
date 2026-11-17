import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

const STEPS = [
  { n: '01', title: 'Complete assessment', text: 'Major, skills and career interests' },
  { n: '02', title: 'Analyze profile', text: 'Compare skills with career requirements' },
  { n: '03', title: 'Recommend careers', text: 'Suggest suitable roles and explain matches' },
  { n: '04', title: 'Build skill roadmap', text: 'Show gaps and recommended learning steps' },
];

export default function Home() {
  const { user } = useAuth();
  return (
    <div className="container">
      <section className="hero">
        <h1>From graduation to a clear career direction</h1>
        <p>PathFinder AI helps graduates connect their education and skills to suitable career paths.</p>
        <Link to={user ? '/assessment' : '/register'} className="btn">
          {user ? 'Continue assessment' : 'Start your assessment'}
        </Link>
      </section>
      <section className="steps">
        {STEPS.map((s) => (
          <div key={s.n} className="card step">
            <span className="step-n">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
