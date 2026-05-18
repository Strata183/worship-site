import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";

function cleanFileName(name) {
  return name
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function Library() {
  const { user } = useAuth();
  const [songs, setSongs] = useState([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSongs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSongs() {
    setLoadingSongs(true);
    setError("");

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
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

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

    const songId = crypto.randomUUID();
    const safeName = cleanFileName(file.name) || "song";
    const filePath = `${user.id}/${songId}-${safeName}.pdf`;
    const songTitle = title.trim() || file.name.replace(/\.pdf$/i, "");

    const { error: uploadError } = await supabase.storage
      .from("song-pdfs")
      .upload(filePath, file, {
        contentType: "application/pdf",
      });

    if (uploadError) {
      setError(uploadError.message);
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("songs").insert({
      id: songId,
      owner_id: user.id,
      title: songTitle,
      file_path: filePath,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setMessage("Song uploaded.");
      setTitle("");
      setFile(null);
      event.target.reset();
      await loadSongs();
    }

    setSubmitting(false);
  }

  async function openPdf(song) {
    setError("");

    const { data, error: signedUrlError } = await supabase.storage
      .from("song-pdfs")
      .createSignedUrl(song.file_path, 60);

    if (signedUrlError) {
      setError(signedUrlError.message);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteSong(song) {
    setError("");
    setMessage("");

    const { error: storageError } = await supabase.storage
      .from("song-pdfs")
      .remove([song.file_path]);

    if (storageError) {
      setError(storageError.message);
      return;
    }

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

  return (
    <main className="page app-page">
      <section className="page-heading">
        <p className="eyebrow">Your PDF songs</p>
        <h1>Songs</h1>
        <p>Upload your chord charts and open songs shared by accepted friends.</p>
      </section>

      <section className="tool-layout">
        <form className="tool-panel form-stack" onSubmit={handleUpload}>
          <h2>Upload PDF</h2>
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
            PDF file
            <input
              accept="application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              required
              type="file"
            />
          </label>
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? "Uploading..." : "Upload song"}
          </button>
          {message && <p className="form-message success">{message}</p>}
          {error && <p className="form-message error">{error}</p>}
        </form>

        <section className="tool-panel">
          <div className="panel-header">
            <h2>Available songs</h2>
            <button className="text-button" type="button" onClick={loadSongs}>
              Refresh
            </button>
          </div>

          {loadingSongs ? (
            <p className="empty-state">Loading songs...</p>
          ) : songs.length === 0 ? (
            <p className="empty-state">No songs yet. Upload your first PDF.</p>
          ) : (
            <ul className="song-list">
              {songs.map((song) => {
                const isOwner = song.owner_id === user.id;

                return (
                  <li key={song.id}>
                    <div>
                      <h3>{song.title}</h3>
                      <p>{isOwner ? "Your song" : "Shared by a friend"}</p>
                    </div>
                    <div className="row-actions">
                      <button type="button" onClick={() => openPdf(song)}>
                        Open
                      </button>
                      {isOwner && (
                        <button type="button" onClick={() => deleteSong(song)}>
                          Delete
                        </button>
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
