import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, friendlyError } from './supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Keep track of the logged-in user (Supabase stores the session in the browser).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => sub.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;

  // Load the user's profile (full name for the avatar) from the profiles table.
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user?.id]);

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendlyError(error));
  };

  const register = async (fullName, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }, // saved into profiles automatically
    });
    if (error) throw new Error(friendlyError(error));
    if (!data.session) throw new Error('Account created. Please confirm your email, then log in.');
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const fullName = profile?.full_name || user?.user_metadata?.full_name || '';

  const value = { user, fullName, loading, login, register, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
