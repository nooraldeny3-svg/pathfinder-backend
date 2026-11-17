import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The app talks to Supabase directly (see src/supabase.js), so no dev proxy is needed.
export default defineConfig({
  plugins: [react()],
});
