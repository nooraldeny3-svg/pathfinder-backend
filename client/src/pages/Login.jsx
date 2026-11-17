import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import AuthForm from '../components/AuthForm.jsx';

export default function Login() {
  const { user, login } = useAuth();
  if (user) return <Navigate to="/start" replace />;
  return (
    <AuthForm
      title="Log in"
      submitLabel="Log in"
      fields={[
        { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
        { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' },
      ]}
      onSubmit={(v) => login(v.email, v.password)}
      footer={{ text: 'New here?', to: '/register', link: 'Create an account' }}
    />
  );
}
