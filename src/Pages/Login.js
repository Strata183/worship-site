import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";

function Login() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState("sign-in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || "/songs";

  if (user) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setStatus("");

    const authCall =
      mode === "sign-up"
        ? supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                display_name: displayName,
              },
            },
          })
        : supabase.auth.signInWithPassword({ email, password });

    const { data, error: authError } = await authCall;

    setSubmitting(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (mode === "sign-up" && !data.session) {
      setStatus("Check your email to confirm your account, then sign in.");
      return;
    }

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
            onClick={() => setMode("sign-in")}
          >
            Sign in
          </button>
          <button
            className={mode === "sign-up" ? "active" : ""}
            type="button"
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
