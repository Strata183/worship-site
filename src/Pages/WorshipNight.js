import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";

// Replace these details when the date and venue are confirmed.
const eventDetails = {
  date: "November 23, 2026",
  time: "6:00 PM",
};

function FittedLyricLine({ line }) {
  const lineRef = useRef(null);

  useLayoutEffect(() => {
    const element = lineRef.current;
    const container = element?.parentElement;
    if (!element || !container) return undefined;

    function fitLine() {
      element.style.fontSize = "";
      const baseSize = parseFloat(window.getComputedStyle(element).fontSize);
      let size = baseSize;
      const minSize = 12;
      element.style.fontSize = `${size}px`;
      while (element.scrollWidth > container.clientWidth && size > minSize) {
        size = Math.max(minSize, size - 0.5);
        element.style.fontSize = `${size}px`;
      }
    }

    const observer = new ResizeObserver(fitLine);
    observer.observe(container);
    fitLine();
    return () => observer.disconnect();
  }, [line]);

  return <p className="worship-night-lyrics-line" ref={lineRef}>{line}</p>;
}

function WorshipNight() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [songs, setSongs] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [lyricsStatus, setLyricsStatus] = useState("");
  const [savingSong, setSavingSong] = useState(null);
  const songMenuRef = useRef(null);
  const pageUrl = typeof window !== "undefined" ? `${window.location.origin}/worship-night` : "";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(pageUrl)}`;

  const loadLyrics = useCallback(async () => {
    const { data } = await supabase.from("worship_night_songs")
      .select("id, title, lyrics, position").order("position").order("created_at");
    setSongs(data || []);
  }, []);

  useEffect(() => { loadLyrics(); }, [loadLyrics]);
  useEffect(() => {
    function closeMenuOnOutsideClick(event) {
      if (songMenuRef.current && !songMenuRef.current.contains(event.target)) {
        songMenuRef.current.open = false;
      }
    }
    function closeMenuOnEscape(event) {
      if (event.key === "Escape" && songMenuRef.current) songMenuRef.current.open = false;
    }
    document.addEventListener("pointerdown", closeMenuOnOutsideClick);
    document.addEventListener("keydown", closeMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenuOnOutsideClick);
      document.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, []);
  useEffect(() => {
    let active = true;
    async function checkAdmin() {
      if (!user) { setIsAdmin(false); setAdminMode(false); return; }
      const { data } = await supabase.rpc("is_worship_night_admin", { user_id: user.id });
      if (active) setIsAdmin(Boolean(data));
    }
    checkAdmin();
    return () => { active = false; };
  }, [user]);

  async function saveSong(song) {
    setSavingSong(song.id || "new"); setLyricsStatus("");
    const values = { title: song.title.trim(), lyrics: song.lyrics, position: song.position };
    const result = song.id
      ? await supabase.from("worship_night_songs").update(values).eq("id", song.id)
      : await supabase.from("worship_night_songs").insert(values);
    if (result.error) setLyricsStatus(`Could not save: ${result.error.message}`);
    else { setLyricsStatus("Lyrics saved."); await loadLyrics(); }
    setSavingSong(null);
  }

  async function deleteSong(id) {
    if (!window.confirm("Delete this song and its lyrics?")) return;
    const { error } = await supabase.from("worship_night_songs").delete().eq("id", id);
    if (error) setLyricsStatus(`Could not delete: ${error.message}`);
    else { setLyricsStatus("Song deleted."); await loadLyrics(); }
  }

  function updateSong(index, field, value) {
    setSongs((current) => current.map((song, songIndex) => songIndex === index ? { ...song, [field]: value } : song));
  }

  function jumpToSong(songKey) {
    if (!songKey) return;
    document.getElementById(`worship-song-${songKey}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderLyrics(lyrics) {
    return lyrics.split(/\r?\n/).map((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return <div aria-hidden="true" className="worship-night-lyrics-spacer" key={`line-${index}`} />;
      if (/^\[[^\]]+\]$/.test(trimmedLine)) {
        return <p className="worship-night-lyrics-section-label" key={`line-${index}`}>{trimmedLine}</p>;
      }
      return <FittedLyricLine key={`line-${index}`} line={line} />;
    });
  }

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
            {status === "success" && "You’re on the list! A confirmation email is on its way."}
            {status === "already-signed-up" && "That email is already signed up. Thanks for being here!"}
            {status === "error" && "We couldn’t save your signup right now. Please try again in a moment."}
          </p>
          <small>We’ll send a confirmation and email updates about Worship Night.</small>
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

      <section className="worship-night-lyrics" aria-label="Worship Night song lyrics">
        <div className="worship-night-lyrics-heading">
          <div><h2>Song lyrics</h2></div>
          {isAdmin && <button type="button" className="worship-night-admin-toggle" aria-pressed={adminMode} onClick={() => setAdminMode((value) => !value)}>{adminMode ? "Exit admin mode" : "Admin mode"}</button>}
        </div>
        {lyricsStatus && <p className="worship-night-lyrics-status" role="status">{lyricsStatus}</p>}
        {songs.length === 0 && !adminMode && <p className="worship-night-lyrics-empty">Song lyrics will be posted here soon.</p>}
        {songs.length > 0 && <details className="worship-night-song-jump" ref={songMenuRef}>
          <summary aria-label="Open song table of contents">
            <span aria-hidden="true" className="worship-night-menu-icon"><i /><i /><i /></span>
            <span>Table of contents</span>
          </summary>
          <ol>
            {songs.map((song, index) => {
              const songKey = song.id || `draft-${index}`;
              return <li key={songKey}><a href={`#worship-song-${songKey}`} onClick={(event) => {
                event.preventDefault();
                jumpToSong(songKey);
                event.currentTarget.closest("details").open = false;
              }}>{song.title.trim() || `Untitled song ${index + 1}`}</a></li>;
            })}
          </ol>
        </details>}
        <div className="worship-night-song-list">
          {songs.map((song, index) => {
            const songKey = song.id || `draft-${index}`;
            return <article className="worship-night-song" id={`worship-song-${songKey}`} key={songKey}>
            {adminMode ? <>
              <label>Song title<input value={song.title} onChange={(event) => updateSong(index, "title", event.target.value)} /></label>
              <label>Lyrics<textarea rows={14} value={song.lyrics} onChange={(event) => updateSong(index, "lyrics", event.target.value)} /></label>
              <details className="worship-night-live-preview">
                <summary>Live mobile preview</summary>
                <p className="worship-night-preview-note">Long lines shrink to fit the available screen width.</p>
                <div className="worship-night-preview-card">
                  <h3>{song.title.trim() || "Song title"}</h3>
                  <div className="worship-night-lyrics-text">{renderLyrics(song.lyrics)}</div>
                </div>
              </details>
              <div className="worship-night-song-admin-actions"><button disabled={savingSong === (song.id || "new")} onClick={() => saveSong(song)} type="button">{savingSong === (song.id || "new") ? "Saving…" : "Save lyrics"}</button>{song.id && <button className="worship-night-delete" onClick={() => deleteSong(song.id)} type="button">Delete song</button>}</div>
            </> : <><h3>{song.title}</h3><div className="worship-night-lyrics-text">{renderLyrics(song.lyrics)}</div></>}
          </article>;
          })}
          {adminMode && <button className="worship-night-add-song" onClick={() => setSongs((current) => [...current, { title: "", lyrics: "", position: current.length }])} type="button">+ Add a song</button>}
        </div>
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
