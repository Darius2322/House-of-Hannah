import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// main.jsx shows a clear configuration screen when these are missing, so the
// app never boots against an undefined endpoint. The placeholders below only
// exist so importing this module can't throw before that screen renders.
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url || "https://placeholder.invalid", anonKey || "placeholder", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // no OAuth/magic-link flows are used
  },
});
