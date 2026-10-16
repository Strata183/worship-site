import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";

// Replace these details when the date and venue are confirmed.
const eventDetails = {
  date: "November 23, 2026",
  time: "6:00 PM",
};

function WorshipNight() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const pageUrl = typeof window !== "undefined" ? `${window.location.origin}/worship-night` : "";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(pageUrl)}`;

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("submitting");

    const { error } = await supabase
      .from("worship_night_email_signups")
      .insert({ email: (user?.email || email).trim().toLowerCase() });

    if (error && error.code === "23505") {
      setStatus("already-signed-up");
    } else if (error) {
      setStatus("error");
    } else {
      setStatus("success");
      setEmail("");
    }
  }

  return (
    <main className="page page-worship-night worship-night-page">
      <Link className="worship-night-back-link" to="/">
        <span aria-hidden="true">←</span> Worthy for Worship
      </Link>
      <section className="worship-night-hero">
        <div className="worship-night-artwork">
          <img
            alt="A campfire at Worship Night"
            onError={(event) => { event.currentTarget.style.display = "none"; }}
            src="/worship-night-campfire.png"
          />
        </div>
        <div className="worship-night-intro">
          <p className="eyebrow">You’re invited</p>
          <h1>Worthy for Worship: Worship Night</h1>
          <p>
            Let’s gather, lift our voices, and worship God together.
            Sign up for email updates and event reminders for this and future events.
          </p>
          <div className="worship-night-details" aria-label="Event details">
            <div><span>Next date</span><strong>{eventDetails.date}</strong></div>
            <div><span>Time</span><strong>{eventDetails.time}</strong></div>
          </div>
        </div>
      </section>

      <section className="worship-night-actions">
        <div className="worship-night-signup">
          <p className="eyebrow">Stay in the loop</p>
          <h2>Get worship night updates</h2>
          <p>We’ll email you when the date, time, and location are confirmed.</p>
          <form className="worship-night-form" onSubmit={handleSubmit}>
            {user?.email ? (
              <p className="worship-night-signed-in">
                Signed in as <strong>{user.email}</strong>
              </p>
            ) : (
              <>
                <label htmlFor="worship-night-email">Email address</label>
                <div className="worship-night-input-row">
                  <input
                    autoComplete="email"
                    id="worship-night-email"
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    type="email"
                    value={email}
                  />
                </div>
              </>
            )}
            <button disabled={status === "submitting"} type="submit">
              {status === "submitting" ? "Subscribing…" : "Subscribe to email newsletter"}
            </button>
          </form>
          <p aria-live="polite" className="worship-night-message">
            {status === "success" && "You’re on the list! Watch your inbox for updates."}
            {status === "already-signed-up" && "That email is already signed up. Thanks for being here!"}
            {status === "error" && "We couldn’t save your signup right now. Please try again in a moment."}
          </p>
          <small>You’re signing up for worship night email updates. You can unsubscribe at any time.</small>
        </div>

        <aside className="worship-night-qr">
          <p className="eyebrow">Help us spread the word</p>
          <h2>Scan to sign up</h2>
          {pageUrl && <img alt="QR code linking to the Worship Night page" height="220" src={qrUrl} width="220" />}
          <p>Share this page or scan the code to join the email list.</p>
          <button className="worship-night-share" onClick={() => navigator.clipboard.writeText(pageUrl)} type="button">
            Copy page link
          </button>
        </aside>
      </section>

      <div className="worship-night-archive-link-wrap">
        <Link className="worship-night-archive-link" to="/worship-night/archive">
          Explore past Worship Nights <span aria-hidden="true">→</span>
        </Link>
      </div>
    </main>
  );
}

export default WorshipNight;
