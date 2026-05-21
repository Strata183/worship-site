import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";

// Login handles two related jobs:
// 1. signing in existing users
// 2. creating new accounts
function Login() {
  const { user } = useAuth();

  // useLocation can read route state, such as the protected page a user tried
  // to visit before being redirected here.
  const location = useLocation();

  // useNavigate lets this component move the user to another page in code.
  const navigate = useNavigate();

  // mode controls which form version is active: sign-in or sign-up.
  const [mode, setMode] = useState("sign-in");

  // These states track what the user types into the form fields.
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // status is for success/help messages; error is for things that went wrong.
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // submitting disables the button while the request is in progress.
  const [submitting, setSubmitting] = useState(false);

  // If the user came from ProtectedRoute, go back there after login.
  // Otherwise, default to the Songs library.
  const from = location.state?.from?.pathname || "/songs";

  if (user) {
    // Already signed in? There is no reason to show the login form.
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event) {
    // Stop the browser from doing a normal form submit/page reload.
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setStatus("");

    // Choose the Supabase auth method based on the current tab.
    const authCall =
      mode === "sign-up"
        ? supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                display_name: displayName,
              },
              // After email confirmation, Supabase should send users back here.
              emailRedirectTo: `${window.location.origin}/songs`,
            },
          })
        : supabase.auth.signInWithPassword({ email, password });

    const { data, error: authError } = await authCall;

    setSubmitting(false);

    if (authError) {
      // Supabase sends back readable messages like invalid password,
      // user already registered, or email sending issues.
      setError(authError.message);
      return;
    }

    if (mode === "sign-up" && !data.session) {
      // If email confirmation is enabled, Supabase creates the user but does
      // not give the browser a session until they confirm their email.
      setStatus("Check your email to confirm your account, then sign in.");
      return;
    }

    // Successful sign-in goes back to the intended protected page.
    navigate(from, { replace: true });
  }

  return (
    <main className="page auth-page">
      <section className="auth-panel">
        <p className="eyebrow">Private song library</p>
        <h1>{mode === "sign-up" ? "Create your account" : "Welcome back"}</h1>
        <p>
          Sign in to upload your own PDF songs and share them with accepted
          friends.
        </p>

        <div className="auth-tabs" aria-label="Login mode">
          <button
            className={mode === "sign-in" ? "active" : ""}
            type="button"
            // type="button" prevents this tab button from submitting the form.
            onClick={() => setMode("sign-in")}
          >
            Sign in
          </button>
          <button
            className={mode === "sign-up" ? "active" : ""}
            type="button"
            // Switching the mode changes which Supabase auth call will run.
            onClick={() => setMode("sign-up")}
          >
            Sign up
          </button>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          {mode === "sign-up" && (
            <label>
              Display name
              <input
                autoComplete="name"
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Jordan"
                type="text"
                value={displayName}
              />
            </label>
          )}

          <label>
            Email
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label>
            Password
            <input
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {error && <p className="form-message error">{error}</p>}
          {status && <p className="form-message success">{status}</p>}

          <button className="primary-button" disabled={submitting} type="submit">
            {submitting
              ? "Working..."
              : mode === "sign-up"
              ? "Create account"
              : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Login;
