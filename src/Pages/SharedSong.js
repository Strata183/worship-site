import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

async function getFunctionErrorMessage(error) {
  if (error?.context instanceof Response) {
    try {
      const body = await error.context.json();
      if (body?.error) return body.error;
    } catch {
      // Use the Supabase error message below.
    }
  }

  return error?.message || "Could not open this chart.";
}

function SharedSong() {
  const { songId } = useParams();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSong() {
      setLoading(true);
      setError("");

      // Supabase RLS returns this chart only to its owner or an accepted friend.
      const { data, error: songError } = await supabase
        .from("songs")
        .select("id, title, song_key")
        .eq("id", songId)
        .maybeSingle();

      if (cancelled) return;

      if (songError || !data) {
        setError("This chart is unavailable. Make sure you’re signed in with an account that is friends with its owner.");
      } else {
        setSong(data);
      }

      setLoading(false);
    }

    loadSong();
    return () => { cancelled = true; };
  }, [songId]);

  async function openChart() {
    setOpening(true);
    setError("");

    const { data, error: signedUrlError } = await supabase.functions.invoke("r2-song-files", {
      body: { action: "signed-url", songId },
    });

    if (signedUrlError) {
      setError(await getFunctionErrorMessage(signedUrlError));
    } else if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } else {
      setError("Could not open this chart.");
    }

    setOpening(false);
  }

  return (
    <main className="page app-page shared-song-page">
      <section className="page-heading">
        <p className="eyebrow">Shared chart</p>
        <h1>{loading ? "Loading chart…" : song?.title || "Chart unavailable"}</h1>
        {song && <p>Key: {song.song_key || "Not specified"}</p>}
      </section>

      {error && <p className="form-message error" role="alert">{error}</p>}

      {song && (
        <section className="form-stack" aria-label="Shared chart actions">
          <p>This chart is shared through Worthy for Worship. Only its owner and accepted friends can open it.</p>
          <button className="shared-song-open-button" disabled={opening} onClick={openChart} type="button">
            {opening ? "Opening…" : "Open PDF chart"}
          </button>
          <Link to="/songs">Go to My Library</Link>
        </section>
      )}
    </main>
  );
}

export default SharedSong;
