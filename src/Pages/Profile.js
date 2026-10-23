import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";

function Profile() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveProfile(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSavingProfile(true);

    const { error: authError } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim() },
    });

    if (authError) {
      setError(authError.message);
      setSavingProfile(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", user.id);

    if (profileError) {
      setError(profileError.message);
    } else {
      setMessage("Profile updated.");
    }
    setSavingProfile(false);
  }

  async function savePassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSavingPassword(true);

    const { error: passwordError } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);

    if (passwordError) {
      setError(passwordError.message);
      return;
    }

    setPassword("");
    setMessage("Password updated.");
  }

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      return;
    }
    navigate("/");
  }

  return (
    <main className="page app-page profile-page">
      <section className="profile-heading">
        <p className="eyebrow">Your account</p>
        <h1>Profile</h1>
        <p>Update the information connected to your account.</p>
      </section>

      <section className="profile-grid">
        <div className="auth-panel profile-card">
          <h2>Account information</h2>
          <form className="form-stack" onSubmit={saveProfile}>
            <label>
              Display name
              <input
                autoComplete="name"
                onChange={(event) => setDisplayName(event.target.value)}
                required
                value={displayName}
              />
            </label>
            <label>
              Email
              <input autoComplete="email" readOnly type="email" value={user.email || ""} />
            </label>
            <button className="primary-button" disabled={savingProfile} type="submit">
              {savingProfile ? "Saving..." : "Save profile"}
            </button>
          </form>
        </div>

        <div className="auth-panel profile-card">
          <h2>Change password</h2>
          <form className="form-stack" onSubmit={savePassword}>
            <label>
              New password
              <input
                autoComplete="new-password"
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <button className="primary-button" disabled={savingPassword} type="submit">
              {savingPassword ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>
      </section>

      {error && <p className="form-message error profile-message">{error}</p>}
      {message && <p className="form-message success profile-message">{message}</p>}

      <nav className="profile-actions" aria-label="Account actions">
        <Link className="secondary-button" to="/friends">Go to friends</Link>
        <button className="secondary-button" onClick={signOut} type="button">
          Sign out
        </button>
      </nav>
    </main>
  );
}

export default Profile;
