import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import AuthForm from '../components/AuthForm.jsx';

export default function Register() {
  const { user, register } = useAuth();
  if (user) return <Navigate to="/start" replace />;
  return (
    <AuthForm
      title="Create your account"
      submitLabel="Continue"
      fields={[
        { name: 'fullName', label: 'Full name', autoComplete: 'name' },
        { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
        { name: 'password', label: 'Password', type: 'password', minLength: 6, autoComplete: 'new-password' },
      ]}
      onSubmit={(v) => register(v.fullName, v.email, v.password)}
      footer={{ text: 'Already have an account?', to: '/login', link: 'Log in' }}
    />
  );
}
