import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

async function getFunctionErrorMessage(error) {
  if (error?.context instanceof Response) {
    try {
      const body = await error.context.json();
      if (body?.error) return body.error;
    } catch {
      // Fall back to the Supabase error message below.
    }
  }

  return error?.message || "Could not open this chart.";
}

function SharedSetlist() {
  const { setlistId } = useParams();
  const [setlist, setSetlist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openingSongId, setOpeningSongId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSetlist() {
      setLoading(true);
      setError("");

      const { data, error: loadError } = await supabase.rpc("get_shared_setlist", {
        requested_setlist_id: setlistId,
      });

      if (cancelled) return;

      if (loadError) {
        setError(loadError.message);
      } else if (!data) {
        setError("This setlist is unavailable. Make sure you’re signed in with an account that is friends with its owner.");
      } else {
        setSetlist(data);
      }

      setLoading(false);
    }

    loadSetlist();
    return () => { cancelled = true; };
  }, [setlistId]);

  async function openSongChart(songId) {
    setOpeningSongId(songId);
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

    setOpeningSongId(null);
  }

  const items = setlist?.items || [];

  return (
    <main className="page app-page shared-setlist-page">
      <section className="page-heading">
        <p className="eyebrow">Shared setlist</p>
        <h1>{loading ? "Loading setlist…" : setlist?.title || "Setlist unavailable"}</h1>
        {setlist?.event_date && <p>{setlist.event_date}</p>}
      </section>

      {error && <p className="form-message error" role="alert">{error}</p>}

      {setlist && (
        <section className="shared-setlist-content" aria-label="Setlist songs">
          {setlist.notes && <p className="shared-setlist-notes">{setlist.notes}</p>}
          {items.length === 0 ? (
            <p className="shared-setlist-empty">There are no songs in this setlist yet.</p>
          ) : (
            <ol className="shared-setlist-items">
              {items.map((item, index) => (
                <li key={item.id}>
                  <span className="shared-setlist-number">{index + 1}</span>
                  <div className="shared-setlist-copy">
                    <h2>{item.item_type === "placeholder" ? item.title || "Note page" : item.song_title || "Chart unavailable"}</h2>
                    {item.item_type === "placeholder" ? (
                      item.body && <p>{item.body}</p>
                    ) : (
                      <p>Key: {item.song_key || "Not specified"}</p>
                    )}
                  </div>
                  {item.item_type === "song" && item.song_id && (
                    <button
                      className="shared-song-open-button"
                      disabled={openingSongId === item.song_id}
                      onClick={() => openSongChart(item.song_id)}
                      type="button"
                    >
                      {openingSongId === item.song_id ? "Opening…" : "Open PDF"}
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}
          <Link className="shared-setlist-library-link" to="/songs">Go to My Library</Link>
        </section>
      )}
    </main>
  );
}

export default SharedSetlist;
