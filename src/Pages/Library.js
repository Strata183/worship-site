import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";

// Turn a file name like "Amazing Grace (Key of G).pdf" into a safer storage
// name like "amazing-grace-key-of-g". This avoids spaces and unusual symbols.
function cleanFileName(name) {
  return name
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Supabase Edge Function errors can contain useful details in the HTTP response.
// This helper tries to pull out the clearest message for the user.
async function getFunctionErrorMessage(error) {
  if (error?.context instanceof Response) {
    try {
      const body = await error.context.json();

      if (body?.error) {
        return body.error;
      }
    } catch {
      try {
        const text = await error.context.text();

        if (text) {
          return text;
        }
      } catch {
        // Fall back to the Supabase client error message below.
      }
    }
  }

  return error?.message || "Unexpected Edge Function error.";
}

const songKeyOptions = [
  "C",
  "C#/Db",
  "D",
  "Eb",
  "E",
  "F",
  "F#/Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

// Library is the protected Songs page.
// Signed-in users can upload PDFs, open PDFs they are allowed to see,
// and delete PDFs they own.
function Library() {
  const { user } = useAuth();

  // songs holds the rows loaded from the Supabase "songs" table.
  const [songs, setSongs] = useState([]);

  // title and file track the upload form inputs.
  const [title, setTitle] = useState("");
  const [songKey, setSongKey] = useState("");
  const [file, setFile] = useState(null);

  // These states only affect how the current song list is displayed.
  // They do not change anything in the database.
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("key");

  // These states control the inline edit form for a song row.
  const [editingSongId, setEditingSongId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSongKey, setEditSongKey] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // loadingSongs controls the "Loading songs..." message.
  const [loadingSongs, setLoadingSongs] = useState(true);

  // submitting prevents duplicate uploads while one upload is already running.
  const [submitting, setSubmitting] = useState(false);

  // message and error display feedback below the upload form.
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Load songs once when the Library page first appears.
    loadSongs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSongs() {
    setLoadingSongs(true);
    setError("");

    // Row Level Security in Supabase should decide which songs this user can see.
    // The frontend simply asks for songs ordered newest first.
    const { data, error: songsError } = await supabase
      .from("songs")
      .select("*")
      .order("created_at", { ascending: false });

    if (songsError) {
      setError(songsError.message);
    } else {
      setSongs(data || []);
    }

    setLoadingSongs(false);
  }

  async function handleUpload(event) {
    // Prevent the browser from refreshing the page after form submit.
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    // Basic frontend validation gives quick feedback before calling Supabase.
    if (!file) {
      setError("Choose a PDF before uploading.");
      setSubmitting(false);
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Only PDF files can be uploaded.");
      setSubmitting(false);
      return;
    }

    if (!songKey) {
      setError("Choose a key for the song before uploading.");
      setSubmitting(false);
      return;
    }

    // Create an id in the browser so the file path and database row can match.
    const songId = crypto.randomUUID();
    const safeName = cleanFileName(file.name) || "song";

    // Store each user's files inside a folder named with their Supabase user id.
    // The Edge Function checks this too, so users cannot upload into another
    // user's folder by changing frontend code.
    const filePath = `${user.id}/${songId}-${safeName}.pdf`;

    // If the user leaves the title blank, use the PDF file name without ".pdf".
    const songTitle = title.trim() || file.name.replace(/\.pdf$/i, "");

    // FormData is required because a real file is being sent to the Edge Function.
    const formData = new FormData();

    formData.append("action", "upload");
    formData.append("filePath", filePath);
    formData.append("file", file);

    // The Edge Function uploads the PDF to Cloudflare R2.
    // The browser does not receive direct R2 credentials, which keeps them secret.
    const { error: uploadError } = await supabase.functions.invoke(
      "r2-song-files",
      {
        body: formData,
      }
    );

    if (uploadError) {
      setError(`PDF upload failed: ${await getFunctionErrorMessage(uploadError)}`);
      setSubmitting(false);
      return;
    }

    // After the file exists in storage, save the searchable metadata in Supabase.
    const { error: insertError } = await supabase.from("songs").insert({
      id: songId,
      owner_id: user.id,
      title: songTitle,
      song_key: songKey,
      file_path: filePath,
    });

    if (insertError) {
      setError(`Song save failed: ${insertError.message}`);
    } else {
      // Reset the form and reload the list so the new song appears.
      setMessage("Song uploaded.");
      setTitle("");
      setSongKey("");
      setFile(null);
      event.target.reset();
      await loadSongs();
    }

    setSubmitting(false);
  }

  async function openPdf(song) {
    setError("");

    // Ask the Edge Function for a temporary signed URL.
    // This lets the user open the PDF without making the R2 bucket public.
    const { data, error: signedUrlError } = await supabase.functions.invoke(
      "r2-song-files",
      {
        body: {
          action: "signed-url",
          songId: song.id,
        },
      }
    );

    if (signedUrlError) {
      setError(await getFunctionErrorMessage(signedUrlError));
      return;
    }

    // Open the signed URL in a new browser tab.
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteSong(song) {
    setError("");
    setMessage("");

    // First delete the actual PDF file from R2 through the Edge Function.
    const { error: storageError } = await supabase.functions.invoke(
      "r2-song-files",
      {
        body: {
          action: "delete",
          songId: song.id,
        },
      }
    );

    if (storageError) {
      setError(await getFunctionErrorMessage(storageError));
      return;
    }

    // Then delete the database row from Supabase.
    // Doing both keeps the database and file storage in sync.
    const { error: deleteError } = await supabase
      .from("songs")
      .delete()
      .eq("id", song.id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setMessage("Song deleted.");
      await loadSongs();
    }
  }

  function startEditingSong(song) {
    setEditingSongId(song.id);
    setEditTitle(song.title || "");
    setEditSongKey(song.song_key || "");
    setMessage("");
    setError("");
  }

  function cancelEditingSong() {
    setEditingSongId(null);
    setEditTitle("");
    setEditSongKey("");
  }

  async function saveSongEdit(song) {
    const nextTitle = editTitle.trim();

    if (!nextTitle) {
      setError("Song title cannot be blank.");
      return;
    }

    if (!editSongKey) {
      setError("Choose a key for the song.");
      return;
    }

    setSavingEdit(true);
    setError("");
    setMessage("");

    const { error: updateError } = await supabase
      .from("songs")
      .update({
        title: nextTitle,
        song_key: editSongKey,
      })
      .eq("id", song.id)
      .eq("owner_id", user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage("Song updated.");
      cancelEditingSong();
      await loadSongs();
    }

    setSavingEdit(false);
  }

  // This prepares the list for the screen: filter by search and sort the result.
  // It does not re-query Supabase.
  const visibleSongs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return songs
      .filter((song) => {
        if (!query) {
          return true;
        }

        return song.title?.toLowerCase().includes(query);
      })
      .sort((firstSong, secondSong) => {
        if (sortMode === "newest") {
          return new Date(secondSong.created_at || 0) - new Date(firstSong.created_at || 0);
        }

        if (sortMode === "oldest") {
          return new Date(firstSong.created_at || 0) - new Date(secondSong.created_at || 0);
        }

        if (sortMode === "key") {
          const firstKey = songKeyOptions.indexOf(firstSong.song_key);
          const secondKey = songKeyOptions.indexOf(secondSong.song_key);
          const firstKeyIndex = firstKey === -1 ? songKeyOptions.length : firstKey;
          const secondKeyIndex = secondKey === -1 ? songKeyOptions.length : secondKey;

          if (firstKeyIndex !== secondKeyIndex) {
            return firstKeyIndex - secondKeyIndex;
          }

          return (firstSong.title || "").localeCompare(secondSong.title || "");
        }

        return (firstSong.title || "").localeCompare(secondSong.title || "");
      });
  }, [searchQuery, songs, sortMode]);

  function formatSongDate(song) {
    if (!song.created_at) {
      return "No date";
    }

    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(song.created_at));
  }

  return (
    <main className="page app-page library-page">
      <section className="library-shell">
        <aside className="library-sidebar" aria-label="Song library sections">
          <div className="library-brand-block">
            <p className="eyebrow">PDF library</p>
            <h1>My Library</h1>
            <p>Open charts, organize your scores, and sort songs by title or key.</p>
          </div>

          <div className="library-shelves" aria-label="Library shelves">
            <button
              className="active"
              type="button"
            >
              <span>My Library</span>
              <strong>{songs.length}</strong>
            </button>
            <button
              disabled
              type="button"
              title="Coming in a later step"
            >
              <span>Friends' Libraries</span>
              <strong>Next</strong>
            </button>
            <button disabled type="button" title="Coming in a later step">
              <span>Setlists</span>
              <strong>Next</strong>
            </button>
            <button disabled type="button" title="Coming in a later step">
              <span>Folders</span>
              <strong>Next</strong>
            </button>
          </div>
        </aside>

        <section className="score-browser">
          <form className="upload-card upload-card-main form-stack" onSubmit={handleUpload}>
            <div className="upload-card-heading">
              <h2>Add Score</h2>
              <p>Add a PDF chart with a required song key.</p>
            </div>
            <label>
              Song title
              <input
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Amazing Grace"
                type="text"
                value={title}
              />
            </label>
            <label>
              Key
              <select
                onChange={(event) => setSongKey(event.target.value)}
                required
                value={songKey}
              >
                <option value="">Choose key</option>
                {songKeyOptions.map((keyName) => (
                  <option key={keyName} value={keyName}>
                    {keyName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              PDF file
              <input
                accept="application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                required
                type="file"
              />
            </label>
            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? "Uploading..." : "Upload score"}
            </button>
            {message && <p className="form-message success">{message}</p>}
            {error && <p className="form-message error">{error}</p>}
          </form>

          <div className="library-toolbar">
            <div className="library-count" aria-label="Library summary">
              <strong>{songs.length}</strong>
              <span>{songs.length === 1 ? "song" : "songs"}</span>
            </div>
            <label>
              Search
              <input
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by title"
                type="search"
                value={searchQuery}
              />
            </label>
            <label>
              Sort
              <select onChange={(event) => setSortMode(event.target.value)} value={sortMode}>
                <option value="title">Alphabetical</option>
                <option value="key">Key: C to B</option>
                <option value="newest">Newest Added</option>
                <option value="oldest">Oldest Added</option>
              </select>
            </label>
          </div>

          {loadingSongs ? (
            <p className="empty-state">Loading songs...</p>
          ) : songs.length === 0 ? (
            <div className="library-empty-state">
              <h3>No scores yet</h3>
              <p>Upload your first PDF chart from the Add Score panel.</p>
            </div>
          ) : visibleSongs.length === 0 ? (
            <div className="library-empty-state">
              <h3>No matching scores</h3>
              <p>Try a different search.</p>
            </div>
          ) : (
            <ul className="score-list">
              {visibleSongs.map((song) => {
                // Owners can delete their own songs. Friends can only open them.
                const isOwner = song.owner_id === user.id;
                const isEditing = editingSongId === song.id;

                return (
                  <li key={song.id}>
                    {isEditing ? (
                      <div className="score-edit-form">
                        <label>
                          Title
                          <input
                            onChange={(event) => setEditTitle(event.target.value)}
                            type="text"
                            value={editTitle}
                          />
                        </label>
                        <label>
                          Key
                          <select
                            onChange={(event) => setEditSongKey(event.target.value)}
                            value={editSongKey}
                          >
                            <option value="">Choose key</option>
                            {songKeyOptions.map((keyName) => (
                              <option key={keyName} value={keyName}>
                                {keyName}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ) : (
                      <button
                        className="score-open-button"
                        type="button"
                        onClick={() => openPdf(song)}
                      >
                        <span className="score-main">
                          <strong>{song.title}</strong>
                          <span>
                            {isOwner ? "My library" : "Friend library"} · Added{" "}
                            {formatSongDate(song)}
                          </span>
                        </span>
                        <span className="score-key">{song.song_key || "No key"}</span>
                      </button>
                    )}

                    <div className="score-actions">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            disabled={savingEdit}
                            onClick={() => saveSongEdit(song)}
                          >
                            {savingEdit ? "Saving..." : "Save"}
                          </button>
                          <button type="button" onClick={cancelEditingSong}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => openPdf(song)}>
                            Open
                          </button>
                          {isOwner && (
                            <>
                              <button type="button" onClick={() => startEditingSong(song)}>
                                Edit
                              </button>
                              <button type="button" onClick={() => deleteSong(song)}>
                                Delete
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}

export default Library;
