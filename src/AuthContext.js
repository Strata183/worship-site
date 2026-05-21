import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

// A Context is React's way to share data with many components without manually
// passing props through every layer. This one shares auth/session information.
const AuthContext = createContext(null);

// AuthProvider wraps the app in App.js.
// Anything inside it can call useAuth() to learn who is signed in.
export function AuthProvider({ children }) {
  // session is Supabase's full login session object.
  // It contains the user, access token, and other auth details.
  const [session, setSession] = useState(null);

  // profile is the row from the custom "profiles" table.
  // This gives the app friendly data like display_name and email.
  const [profile, setProfile] = useState(null);

  // loading starts true while Supabase checks whether the browser already has
  // a saved login session from a previous visit.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    // On page refresh, ask Supabase if the user is already signed in.
    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      if (!ignore) {
        setSession(data.session);
        setLoading(false);
      }
    }

    loadSession();

    // Keep React in sync when the user signs in, signs out, or confirms email.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      // Cleanup prevents React from updating this component after it unmounts.
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Whenever the session changes, create or load the user's profile row.
    async function loadProfile() {
      if (!session?.user) {
        setProfile(null);
        return;
      }

      const displayName =
        session.user.user_metadata?.display_name ||
        session.user.email?.split("@")[0] ||
        "Friend";
      const email = session.user.email?.toLowerCase();

      // upsert means "insert this row, or update it if it already exists."
      // This makes sure every signed-in user has a matching profiles row.
      await supabase.from("profiles").upsert({
        id: session.user.id,
        display_name: displayName,
        email,
      });

      // After saving, read the full profile row back into React state.
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(data);
    }

    loadProfile();
  }, [session]);

  // useMemo avoids creating a brand-new object on every render unless one of
  // these values actually changed.
  const value = useMemo(
    () => ({
      loading,
      profile,
      session,
      user: session?.user ?? null,
    }),
    [loading, profile, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook used by other components.
// Example: const { user } = useAuth();
export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    // This catches a setup mistake: using useAuth outside of <AuthProvider>.
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}
