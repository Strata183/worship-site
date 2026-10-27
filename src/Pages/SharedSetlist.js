import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import EventRoleChips from "../Components/EventRoleChips";
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
  const navigate = useNavigate();
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
        if (data.is_event) {
          const { data: isTeamMember } = await supabase.rpc("is_event_team_member", {
            requested_event_id: setlistId,
          });
          if (cancelled) return;
          if (isTeamMember) {
            navigate(`/songs?event=${encodeURIComponent(setlistId)}`, { replace: true });
            return;
          }
        }
        setSetlist(data);
      }

      setLoading(false);
    }

    loadSetlist();
    return () => { cancelled = true; };
  }, [navigate, setlistId]);

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
  const team = setlist?.team || [];
  const formatDate = (dateValue) => {
    if (!dateValue) return "";
    return new Intl.DateTimeFormat("en", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${dateValue}T00:00:00`));
  };

  return (
    <main className="page app-page shared-setlist-page">
      <section className="page-heading">
        <p className="eyebrow">{setlist?.is_event ? "Shared event · View only" : "Shared setlist"}</p>
        <h1>{loading ? "Loading setlist…" : setlist?.title || "Setlist unavailable"}</h1>
        {setlist?.event_date && <p>{formatDate(setlist.event_date)}</p>}
      </section>

      {error && <p className="form-message error" role="alert">{error}</p>}

      {setlist && (
        <section className="shared-setlist-content" aria-label="Setlist songs">
          {setlist.is_event && (
            <>
              <section className="shared-event-section">
                <h2>Overview</h2>
                <dl className="shared-event-details">
                  {setlist.start_time && <div><dt>Start</dt><dd>{setlist.start_time.slice(0, 5)}</dd></div>}
                  {setlist.end_time && <div><dt>End</dt><dd>{setlist.end_time.slice(0, 5)}</dd></div>}
                  {setlist.location && <div><dt>Location</dt><dd>{setlist.location}</dd></div>}
                </dl>
                {setlist.notes && <p className="shared-setlist-notes">{setlist.notes}</p>}
              </section>
              {(setlist.theme || setlist.flow_notes) && (
                <section className="shared-event-section">
                  <h2>Themes &amp; Flow</h2>
                  {setlist.theme && <p><strong>Theme / Scripture</strong><br />{setlist.theme}</p>}
                  {setlist.flow_notes && <p className="shared-event-preformatted">{setlist.flow_notes}</p>}
                </section>
              )}
            </>
          )}
          {!setlist.is_event && setlist.notes && <p className="shared-setlist-notes">{setlist.notes}</p>}
          <h2 className="shared-event-section-title">{setlist.is_event ? "Song Plan" : "Songs"}</h2>
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
                      <>
                        <p>Key: {item.song_key || "Not specified"}</p>
                        {setlist.is_event && [item.artist_version, item.tempo_feel, item.theme_scripture, item.lead_vocal, item.other_vocals, item.arrangement, item.status, item.notes_link].filter(Boolean).length > 0 && (
                          <p className="shared-event-song-meta">
                            {[item.artist_version, item.tempo_feel, item.theme_scripture, item.lead_vocal, item.other_vocals, item.arrangement, item.status, item.notes_link].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </>
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
          {setlist.is_event && team.length > 0 && (
            <section className="shared-event-section">
              <h2>Team &amp; Instruments</h2>
              <div className="shared-event-team">
                {team.map((member, index) => (
                  <article key={`${member.display_name}-${index}`}>
                    <strong>{member.display_name}</strong>
                    <EventRoleChips roles={member.roles || []} />
                    {member.instrument_part && <p><b>Instrument / Part:</b> {member.instrument_part}</p>}
                    {member.needs_gear && <p><b>Needs / Gear:</b> {member.needs_gear}</p>}
                    {member.contact_notes && <p><b>Contact / Notes:</b> {member.contact_notes}</p>}
                  </article>
                ))}
              </div>
            </section>
          )}
          <Link className="shared-setlist-library-link" to="/songs">Go to My Library</Link>
        </section>
      )}
    </main>
  );
}

export default SharedSetlist;
