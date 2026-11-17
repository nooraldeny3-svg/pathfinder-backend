import { useAuth } from '../AuthContext.jsx';
import AuthForm from '../components/AuthForm.jsx';

export default function Register() {
  const { register } = useAuth();
  return (
    <AuthForm
      title="Create your account"
      submitLabel="Sign up"
      fields={[
        { name: 'fullName', label: 'Full name', autoComplete: 'name' },
        { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
        { name: 'password', label: 'Password (min. 8 characters)', type: 'password', minLength: 8, autoComplete: 'new-password' },
      ]}
      onSubmit={(v) => register(v.fullName, v.email, v.password)}
      footer={{ text: 'Already have an account?', to: '/login', link: 'Log in' }}
    />
  );
}
