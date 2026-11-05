import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Returns { loading, session, profile } where `profile` is the signed-in
// user's row from public.profiles (role + is_active). A paused or missing
// profile is treated as "no access": the user is signed out and `profile`
// stays null, so every dashboard guard redirects to its login page.
export function useStaffSession() {
  const [state, setState] = useState({ loading: true, session: null, profile: null });

  useEffect(() => {
    let mounted = true;

    async function loadProfile(session) {
      if (!session) {
        if (mounted) setState({ loading: false, session: null, profile: null });
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      if (!profile || !profile.is_active) {
        await supabase.auth.signOut();
        if (mounted) setState({ loading: false, session: null, profile: null });
        return;
      }
      if (mounted) setState({ loading: false, session, profile });
    }

    supabase.auth.getSession().then(({ data: { session } }) => loadProfile(session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Defer to avoid calling Supabase inside its own auth callback (deadlock risk).
      setTimeout(() => loadProfile(session), 0);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signOut() {
  await supabase.auth.signOut();
}
