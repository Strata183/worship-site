import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
const customKeyValue = "__custom_key__";

function isPresetSongKey(songKey) {
  return songKeyOptions.includes(songKey);
}

// Library is the protected My Library page.
// Signed-in users can upload, open, edit, and delete their own PDF songs.
function Library() {
  const { user } = useAuth();

  // songs holds the rows loaded from the Supabase "songs" table.
  const [songs, setSongs] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [activeShelf, setActiveShelf] = useState("mine");

  // title and file track the upload form inputs.
  const [title, setTitle] = useState("");
  const [songKey, setSongKey] = useState("");
  const [customSongKey, setCustomSongKey] = useState("");
  const [file, setFile] = useState(null);

  // These states only affect how the current song list is displayed.
  // They do not change anything in the database.
  const [searchQuery, setSearchQuery] = useState("");
  const [friendFilter, setFriendFilter] = useState("all");
  const [sortMode, setSortMode] = useState("key");

  // These states control the inline edit form for a song row.
  const [editingSongId, setEditingSongId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSongKey, setEditSongKey] = useState("");
  const [customEditSongKey, setCustomEditSongKey] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // loadingSongs controls the "Loading songs..." message.
  const [loadingSongs, setLoadingSongs] = useState(true);

  // submitting prevents duplicate uploads while one upload is already running.
  const [submitting, setSubmitting] = useState(false);
  const [copyingSongId, setCopyingSongId] = useState(null);

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

    // RLS decides which rows this user is allowed to see. The shelves below
    // split those visible songs into mine and friends.
    const [songsResult, friendshipsResult] = await Promise.all([
      supabase.from("songs").select("*").order("created_at", { ascending: false }),
      supabase.rpc("list_friendships_with_profiles"),
    ]);

    const { data, error: songsError } = songsResult;
    const { data: friendshipsData, error: friendshipsError } = friendshipsResult;

    if (songsError) {
      setError(songsError.message);
    } else if (friendshipsError) {
      setError(friendshipsError.message);
    } else {
      setSongs(data || []);
      setFriendships(friendshipsData || []);
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

    const savedSongKey =
      songKey === customKeyValue ? customSongKey.trim() : songKey;

    if (!savedSongKey) {
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
      song_key: savedSongKey,
      file_path: filePath,
    });

    if (insertError) {
      setError(`Song save failed: ${insertError.message}`);
    } else {
      // Reset the form and reload the list so the new song appears.
      setMessage("Song uploaded.");
      setTitle("");
      setSongKey("");
      setCustomSongKey("");
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

  async function copySongToMyLibrary(song) {
    if (song.owner_id === user.id) {
      return;
    }

    setCopyingSongId(song.id);
    setError("");
    setMessage("");

    const copiedSongId = crypto.randomUUID();
    const safeName = cleanFileName(song.title || "song") || "song";
    const targetFilePath = `${user.id}/${copiedSongId}-${safeName}.pdf`;

    const { data: copyData, error: copyError } = await supabase.functions.invoke(
      "r2-song-files",
      {
        body: {
          action: "copy-song-file",
          songId: song.id,
          targetFilePath,
        },
      }
    );

    if (copyError) {
      setError(await getFunctionErrorMessage(copyError));
      setCopyingSongId(null);
      return;
    }

    const { error: insertError } = await supabase.from("songs").insert({
      id: copiedSongId,
      owner_id: user.id,
      title: song.title,
      song_key: song.song_key,
      file_path: copyData.filePath,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setMessage(`"${song.title}" was added to My Library.`);
      await loadSongs();
    }

    setCopyingSongId(null);
  }

  function startEditingSong(song) {
    // Copy the current row values into temporary edit state.
    // The database is not changed until saveSongEdit runs.
    setEditingSongId(song.id);
    setEditTitle(song.title || "");
    setEditSongKey(isPresetSongKey(song.song_key) ? song.song_key : customKeyValue);
    setCustomEditSongKey(isPresetSongKey(song.song_key) ? "" : song.song_key || "");
    setMessage("");
    setError("");
  }

  function cancelEditingSong() {
    // Leave edit mode and clear the temporary form values.
    setEditingSongId(null);
    setEditTitle("");
    setEditSongKey("");
    setCustomEditSongKey("");
  }

  async function saveSongEdit(song) {
    // Trim keeps users from saving a title that only contains spaces.
    const nextTitle = editTitle.trim();

    if (!nextTitle) {
      setError("Song title cannot be blank.");
      return;
    }

    const savedEditSongKey =
      editSongKey === customKeyValue ? customEditSongKey.trim() : editSongKey;

    if (!savedEditSongKey) {
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
        song_key: savedEditSongKey,
      })
      // Both filters matter: id picks the row, owner_id makes the update
      // owner-only even if a shared song is visible in this list.
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

  const acceptedFriends = useMemo(
    () =>
      friendships
        .filter((friendship) => friendship.status === "accepted")
        .map((friendship) => ({
          id:
            friendship.requester_id === user.id
              ? friendship.addressee_id
              : friendship.requester_id,
          name:
            friendship.other_display_name ||
            friendship.other_email ||
            "Friend",
        }))
        .sort((firstFriend, secondFriend) =>
          firstFriend.name.localeCompare(secondFriend.name)
        ),
    [friendships, user.id]
  );

  const friendsById = useMemo(
    () =>
      acceptedFriends.reduce((friendMap, friend) => {
        friendMap[friend.id] = friend;
        return friendMap;
      }, {}),
    [acceptedFriends]
  );

  // This prepares the list for the screen: filter by shelf, friend, search, and sort.
  // It does not re-query Supabase.
  const visibleSongs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return songs
      .filter((song) => {
        const isMine = song.owner_id === user.id;

        if (activeShelf === "mine" && !isMine) {
          return false;
        }

        if (activeShelf === "friends" && isMine) {
          return false;
        }

        if (
          activeShelf === "friends" &&
          friendFilter !== "all" &&
          song.owner_id !== friendFilter
        ) {
          return false;
        }

        if (!query) {
          return true;
        }

        const ownerName = friendsById[song.owner_id]?.name || "";

        return (
          song.title?.toLowerCase().includes(query) ||
          ownerName.toLowerCase().includes(query)
        );
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
  }, [activeShelf, friendFilter, friendsById, searchQuery, songs, sortMode, user.id]);

  const mySongsCount = songs.filter((song) => song.owner_id === user.id).length;
  const friendSongsCount = songs.filter((song) => song.owner_id !== user.id).length;
  const isMyShelf = activeShelf === "mine";
  const selectedFriendSongsCount =
    friendFilter === "all"
      ? friendSongsCount
      : songs.filter((song) => song.owner_id === friendFilter).length;

  function formatSongDate(song) {
    // Some older rows or test data may not have created_at populated.
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
            <h1>{isMyShelf ? "My Library" : "Friends Library"}</h1>
            <p>
              {isMyShelf
                ? "Open your charts, organize your scores, and sort songs by title or key."
                : "Open charts shared by your accepted friends!"}
            </p>
          </div>

          <div className="library-shelves" aria-label="Library shelves">
            <button
              className={isMyShelf ? "active" : ""}
              onClick={() => setActiveShelf("mine")}
              type="button"
            >
              <span>My Library</span>
              <strong>{mySongsCount}</strong>
            </button>
            <button
              className={activeShelf === "friends" ? "active" : ""}
              onClick={() => setActiveShelf("friends")}
              type="button"
            >
              <span>Friends Library</span>
              <strong>{friendSongsCount}</strong>
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
          {isMyShelf && (
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
                  <option value={customKeyValue}>Custom key</option>
                </select>
                {songKey === customKeyValue && (
                  <input
                    onChange={(event) => setCustomSongKey(event.target.value)}
                    placeholder="Example: C-D"
                    required
                    type="text"
                    value={customSongKey}
                  />
                )}
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
          )}

          {!isMyShelf && error && <p className="form-message error">{error}</p>}

          {!isMyShelf && (
            <div className="friends-library-callout">
              <div>
                <strong>Need to add a friend?</strong>
                <p>Manage requests to unlock more shared songs.</p>
              </div>
              <Link to="/friends">Add friends</Link>
            </div>
          )}

          <div className={`library-toolbar ${isMyShelf ? "" : "friends-library-toolbar"}`}>
            <div className="library-count" aria-label="Library summary">
              <strong>{isMyShelf ? mySongsCount : selectedFriendSongsCount}</strong>
              <span>
                {(isMyShelf ? mySongsCount : selectedFriendSongsCount) === 1
                  ? "song"
                  : "songs"}
              </span>
            </div>
            {!isMyShelf && (
              <label>
                Friend
                <select
                  onChange={(event) => setFriendFilter(event.target.value)}
                  value={friendFilter}
                >
                  <option value="all">All friends</option>
                  {acceptedFriends.map((friend) => (
                    <option key={friend.id} value={friend.id}>
                      {friend.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Search
              <input
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={isMyShelf ? "Search by title" : "Search by title or friend"}
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
          ) : (isMyShelf ? mySongsCount : friendSongsCount) === 0 ? (
            <div className="library-empty-state">
              <h3>{isMyShelf ? "No scores yet" : "No friend scores yet"}</h3>
              <p>
                {isMyShelf
                  ? "Upload your first PDF chart from the Add Score panel."
                  : "Songs from accepted friends will appear here."}
              </p>
              {!isMyShelf && (
                <Link className="empty-state-action" to="/friends">
                  Add or manage friends
                </Link>
              )}
            </div>
          ) : visibleSongs.length === 0 ? (
            <div className="library-empty-state">
              <h3>No matching scores</h3>
              <p>Try a different search.</p>
            </div>
          ) : (
            <ul className="score-list">
              {visibleSongs.map((song) => {
                const isOwner = song.owner_id === user.id;
                // Only one row can be edited at a time.
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
                            <option value={customKeyValue}>Custom key</option>
                          </select>
                          {editSongKey === customKeyValue && (
                            <input
                              onChange={(event) =>
                                setCustomEditSongKey(event.target.value)
                              }
                              placeholder="Example: C-D"
                              required
                              type="text"
                              value={customEditSongKey}
                            />
                          )}
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
                            {isOwner
                              ? "My library"
                              : friendsById[song.owner_id]?.name || "Friends library"}{" "}
                            · Added{" "}
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
                          {!isOwner && (
                            <button
                              disabled={copyingSongId === song.id}
                              type="button"
                              onClick={() => copySongToMyLibrary(song)}
                            >
                              {copyingSongId === song.id
                                ? "Adding..."
                                : "Add to My Library"}
                            </button>
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
