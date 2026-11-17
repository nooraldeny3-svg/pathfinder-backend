import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Intro from './pages/Intro.jsx';
import Questionnaire from './pages/Questionnaire.jsx';
import Analyzing from './pages/Analyzing.jsx';
import Results from './pages/Results.jsx';
import Details from './pages/Details.jsx';
import MyResults from './pages/MyResults.jsx';
import Share from './pages/Share.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="container">Loading…</p>;
  return user ? children : <Navigate to="/login" replace />;
}

function Header() {
  const { user, fullName, logout } = useAuth();
  const navigate = useNavigate();
  const initial = (fullName || user?.email || '?').trim()[0]?.toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="nav">
      <Link to="/" className="brand">
        <span className="brand-icon" aria-hidden="true">💡</span> PathFinder <span>AI</span>
      </Link>
      <nav>
        {user ? (
          <>
            <Link to="/my-results">My results</Link>
            <span className="avatar" title={fullName || user.email}>{initial}</span>
            <button className="link" onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register" className="btn small">Sign up</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/share/:shareId" element={<Share />} />

          <Route path="/start" element={<RequireAuth><Intro /></RequireAuth>} />
          <Route path="/questionnaire/:number" element={<RequireAuth><Questionnaire /></RequireAuth>} />
          <Route path="/analyzing" element={<RequireAuth><Analyzing /></RequireAuth>} />
          <Route path="/results" element={<RequireAuth><Results /></RequireAuth>} />
          <Route path="/results/:resultId" element={<RequireAuth><Results /></RequireAuth>} />
          <Route path="/results/:resultId/:fieldCode" element={<RequireAuth><Details /></RequireAuth>} />
          <Route path="/my-results" element={<RequireAuth><MyResults /></RequireAuth>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
