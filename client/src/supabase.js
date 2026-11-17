import { createClient } from '@supabase/supabase-js';

// Connection to the PathFinder AI Supabase project.
// The URL and the publishable (public) key are safe to have in frontend code.
// They can be overridden with a .env file (see .env.example).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cwlneejdcuuilfuwrfqz.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_MfY7apea2pIvlZiOdrwVaA_vo9O_nDE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Turn Supabase error messages into short, friendly text for the user.
export function friendlyError(error) {
  const msg = error?.message || String(error || 'Something went wrong');
  if (/invalid login credentials/i.test(msg)) return 'Wrong email or password.';
  if (/already registered|already been registered/i.test(msg)) return 'This email is already registered. Please log in.';
  if (/email not confirmed/i.test(msg)) return 'Please confirm your email first, then log in.';
  if (/password should be at least/i.test(msg)) return 'Password is too short (at least 6 characters).';
  if (/failed to fetch|network/i.test(msg)) return 'Could not reach the server. Check your internet connection.';
  return msg;
}
