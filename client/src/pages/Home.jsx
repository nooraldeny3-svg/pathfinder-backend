import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="container">
      <section className="landing">
        <div>
          <p className="eyebrow">AI-Powered Career Path &amp; Skill Recommendation System for University Students and Graduates</p>
          <h1>Discover the career built for you</h1>
          <p className="lead">
            Answer a short questionnaire and get matched career paths, your skill gaps, and a personal roadmap.
          </p>
          <ul className="checks">
            <li>Matched to your strengths and motivations</li>
            <li>Skill gaps and a roadmap for every result</li>
          </ul>
          <Link to="/register" className="btn">Get Started</Link>
        </div>
        <div className="landing-art" aria-hidden="true">🧭</div>
      </section>
    </div>
  );
}
