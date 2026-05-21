import { useEffect, useState } from "react";
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

// Library is the protected Songs page.
// Signed-in users can upload PDFs, open PDFs they are allowed to see,
// and delete PDFs they own.
function Library() {
  const { user } = useAuth();

  // songs holds the rows loaded from the Supabase "songs" table.
  const [songs, setSongs] = useState([]);

  // title and file track the upload form inputs.
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);

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
      file_path: filePath,
    });

    if (insertError) {
      setError(`Song save failed: ${insertError.message}`);
    } else {
      // Reset the form and reload the list so the new song appears.
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
                // Owners can delete their own songs. Friends can only open them.
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
