import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";

function formatRecordingDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function isAudioFile(file) {
  const audioExtensions = [".aac", ".aiff", ".m4a", ".mp3", ".ogg", ".wav", ".webm"];
  const lowerName = file.name.toLowerCase();

  return (
    file.type.startsWith("audio/") ||
    audioExtensions.some((extension) => lowerName.endsWith(extension))
  );
}

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

function SteadfastAudioPlayer({ recording }) {
  const [audioUrl, setAudioUrl] = useState("");
  const [audioError, setAudioError] = useState("");

  useEffect(() => {
    let ignoreResponse = false;

    async function loadAudioUrl() {
      setAudioError("");

      const { data, error } = await supabase.functions.invoke("r2-song-files", {
        body: {
          action: "steadfast-audio-signed-url",
          recordingId: recording.id,
        },
      });

      if (ignoreResponse) {
        return;
      }

      if (error) {
        setAudioUrl("");
        setAudioError(await getFunctionErrorMessage(error));
        return;
      }

      setAudioUrl(data.signedUrl);
    }

    loadAudioUrl();

    return () => {
      ignoreResponse = true;
    };
  }, [recording.id]);

  if (audioError) {
    return <div className="steadfast-audio-placeholder">{audioError}</div>;
  }

  if (!audioUrl) {
    return <div className="steadfast-audio-placeholder">Loading audio...</div>;
  }

  return (
    <audio controls src={audioUrl}>
      Your browser does not support the audio element.
    </audio>
  );
}

// Steadfast is a group-specific resource page.
function Steadfast() {
  const { user } = useAuth();
  const [accessCode, setAccessCode] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [adminMode, setAdminMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [requestStatus, setRequestStatus] = useState("");
  const [accessRequests, setAccessRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [accessMessage, setAccessMessage] = useState("");
  const [recordings, setRecordings] = useState([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [recordingForm, setRecordingForm] = useState({
    date: "",
    note: "",
    songs: "",
    title: "",
  });
  const [selectedAudioFile, setSelectedAudioFile] = useState(null);
  const [uploadingRecording, setUploadingRecording] = useState(false);

  const loadAccessRequests = useCallback(async () => {
    setLoadingRequests(true);

    const { data, error } = await supabase.rpc(
      "list_steadfast_access_requests"
    );

    if (error) {
      setAccessError(error.message);
      setAccessRequests([]);
    } else {
      setAccessRequests(data || []);
    }

    setLoadingRequests(false);
  }, []);

  const loadRecordings = useCallback(async () => {
    if (!isUnlocked) {
      setRecordings([]);
      return;
    }

    setLoadingRecordings(true);

    const { data, error } = await supabase
      .from("steadfast_audio_recordings")
      .select("id, recorded_on, title, songs, note, file_path, content_type")
      .order("recorded_on", { ascending: false })
      .order("uploaded_at", { ascending: false });

    if (error) {
      setAccessError(error.message);
      setRecordings([]);
    } else {
      setRecordings(data || []);
    }

    setLoadingRecordings(false);
  }, [isUnlocked]);

  const loadAccessState = useCallback(async () => {
    if (!user) {
      return;
    }

    setCheckingAccess(true);

    const [accessResult, adminResult, requestResult] = await Promise.all([
      supabase.rpc("has_steadfast_access"),
      supabase.rpc("is_steadfast_admin", {
        user_id: user.id,
      }),
      supabase.rpc("get_steadfast_access_request_status"),
    ]);

    const accessStateError =
      accessResult.error || adminResult.error || requestResult.error;

    if (accessStateError) {
      setAccessError(accessStateError.message);
      setCheckingAccess(false);
      return;
    }

    const nextIsAdmin = Boolean(adminResult.data);
    let nextIsUnlocked = Boolean(accessResult.data);

    if (!nextIsUnlocked) {
      const { data: savedAccess } = await supabase
        .from("steadfast_access")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      nextIsUnlocked = Boolean(savedAccess);
    }

    setIsAdmin(nextIsAdmin);
    setIsUnlocked(nextIsUnlocked);
    setRequestStatus(requestResult.data || "");
    setCheckingAccess(false);

    if (nextIsAdmin) {
      loadAccessRequests();
    }
  }, [loadAccessRequests, user]);

  useEffect(() => {
    let ignore = false;

    async function checkAccess() {
      await loadAccessState();

      if (ignore) {
        setCheckingAccess(false);
      }
    }

    checkAccess();

    return () => {
      ignore = true;
    };
  }, [loadAccessState]);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  async function handleAccessSubmit(event) {
    event.preventDefault();
    setAccessError("");
    setAccessMessage("");

    const { data, error } = await supabase.rpc("claim_steadfast_access", {
      access_code: accessCode,
    });

    if (error) {
      setAccessError(error.message);
      return;
    }

    setAccessCode("");

    if (data) {
      setIsUnlocked(true);
      setAccessMessage("Access unlocked.");
      loadAccessState();
    } else {
      setAccessError("The password worked, but saved access was not found.");
    }
  }

  async function requestAccess() {
    setAccessError("");
    setAccessMessage("");

    const { error } = await supabase.rpc("request_steadfast_access");

    if (error) {
      setAccessError(error.message);
      return;
    }

    setRequestStatus("pending");
    setAccessMessage("Access request sent.");
  }

  async function reviewAccessRequest(requestId, nextStatus) {
    setAccessError("");
    setAccessMessage("");

    const { error } = await supabase.rpc("review_steadfast_access_request", {
      request_id: requestId,
      next_status: nextStatus,
    });

    if (error) {
      setAccessError(error.message);
      return;
    }

    setAccessMessage(`Request ${nextStatus}.`);
    loadAccessRequests();
  }

  function updateRecordingForm(field, value) {
    setRecordingForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function uploadRecording(event) {
    event.preventDefault();

    if (!selectedAudioFile || !user) {
      return;
    }

    setAccessError("");
    setAccessMessage("");

    if (!isAudioFile(selectedAudioFile)) {
      setAccessError("Please choose an audio file.");
      return;
    }

    if (!recordingForm.date || !recordingForm.title.trim()) {
      setAccessError("Please add a recording date and title.");
      return;
    }

    setUploadingRecording(true);

    const extension = selectedAudioFile.name.split(".").pop() || "audio";
    const cleanDate = recordingForm.date;
    const filePath = `${user.id}/steadfast-audio/${cleanDate}-${Date.now()}.${extension}`;
    const formData = new FormData();

    formData.append("action", "upload");
    formData.append("filePath", filePath);
    formData.append("file", selectedAudioFile);

    const { data: uploadData, error: uploadError } = await supabase.functions.invoke(
      "r2-song-files",
      {
        body: formData,
      }
    );

    if (uploadError) {
      setAccessError(await getFunctionErrorMessage(uploadError));
      setUploadingRecording(false);
      return;
    }

    const songs = recordingForm.songs
      .split("\n")
      .map((song) => song.trim())
      .filter(Boolean);

    const { error: saveError } = await supabase
      .from("steadfast_audio_recordings")
      .insert({
        content_type: selectedAudioFile.type,
        file_path: uploadData.filePath,
        note: recordingForm.note.trim(),
        recorded_on: recordingForm.date,
        songs,
        title: recordingForm.title.trim(),
        uploaded_by: user.id,
      });

    if (saveError) {
      setAccessError(saveError.message);
      setUploadingRecording(false);
      return;
    }

    setRecordingForm({
      date: "",
      note: "",
      songs: "",
      title: "",
    });
    setSelectedAudioFile(null);
    setUploadingRecording(false);
    setAccessMessage("Audio recording uploaded.");
    loadRecordings();
  }

  if (checkingAccess) {
    return (
      <main className="page page-steadfast">
        <p>Checking Steadfast access...</p>
      </main>
    );
  }

  if (!isUnlocked) {
    return (
      <main className="page page-steadfast">
        <section className="steadfast-hero">
          <div className="steadfast-hero-copy">
            <p className="eyebrow">Steadfast</p>
            <h1>Welcome, Steadfast!</h1>
            <p>Enter the Steadfast password or request access for your account.</p>
          </div>
        </section>

        <section className="masters-access-panel">
          <form className="form-stack" onSubmit={handleAccessSubmit}>
            <label htmlFor="steadfast-access-code">Password</label>
            <input
              id="steadfast-access-code"
              onChange={(event) => setAccessCode(event.target.value)}
              type="password"
              value={accessCode}
            />

            <button className="primary-button" type="submit">
              Unlock Steadfast
            </button>
          </form>

          <div className="masters-request-access">
            <h2>Need access?</h2>
            <p>
              Send a request and a Steadfast admin can unlock this page for your
              account.
            </p>
            <button
              className="secondary-button"
              disabled={requestStatus === "pending"}
              onClick={requestAccess}
              type="button"
            >
              {requestStatus === "pending" ? "Request pending" : "Request access"}
            </button>
          </div>

          {accessError && <p className="form-message error">{accessError}</p>}
          {accessMessage && <p className="form-message success">{accessMessage}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="page page-steadfast">
      <section className="steadfast-hero">
        <div className="steadfast-hero-copy">
          <p className="eyebrow">Steadfast</p>
          <h1>Steadfast Worship Resources</h1>
          <p>
            A private place for song resources, worship preparation, and audio
            recordings from our fellowship group.
          </p>
        </div>
      </section>

      {isAdmin && (
        <section className="admin-mode-toggle">
          <div>
            <p className="eyebrow">Admin</p>
            <h2>Admin Mode</h2>
          </div>
          <label>
            <input
              checked={adminMode}
              onChange={(event) => setAdminMode(event.target.checked)}
              type="checkbox"
            />
            <span>{adminMode ? "On" : "Off"}</span>
          </label>
        </section>
      )}

      <section className="steadfast-content" aria-label="Steadfast resources">
        <section className="steadfast-section steadfast-feature">
          <div>
            <p className="eyebrow">Start here</p>
            <h2>For Serving Together</h2>
            <p>
              This page is for the Steadfast fellowship group at Grace Community
              Church. My hope is that these resources help us grow in unity,
              song choices, preparation, and thoughtful worship.
            </p>
          </div>

          <div className="steadfast-feature-list">
            <span>Prepare songs before Sunday</span>
            <span>Review recordings from previous weeks</span>
            <span>Stay anchored in biblical worship</span>
          </div>
        </section>

        <section className="steadfast-section steadfast-callout">
          <div className="steadfast-section-heading">
            <p className="eyebrow">Serving</p>
            <h2>Helpful Prerequisites</h2>
          </div>
          <p>
            If you serve with me, I would love for us to be united around a few
            prerequisites since we will be facilitating and leading worship.
            These are simply resources; they are not what make someone eligible
            to serve. My goal is unity.
          </p>
          <p>
            To start, please take some time to read{" "}
            <Link to="/articles/what-is-worship">What Is Worship?</Link> since
            worship leadership should be shaped by a biblical understanding of
            worship itself.
          </p>
        </section>

        <section className="steadfast-section steadfast-audio-section">
          <div className="steadfast-section-heading">
            <p className="eyebrow">Archive</p>
            <h2>Steadfast Audio Recordings</h2>
            <p>
              A place to keep voice recordings from the songs we sing together.
            </p>
          </div>

          {isAdmin && adminMode && (
            <form className="steadfast-audio-upload" onSubmit={uploadRecording}>
              <div className="steadfast-audio-upload-grid">
                <label>
                  Date
                  <input
                    onChange={(event) =>
                      updateRecordingForm("date", event.target.value)
                    }
                    type="date"
                    value={recordingForm.date}
                  />
                </label>
                <label>
                  Title
                  <input
                    onChange={(event) =>
                      updateRecordingForm("title", event.target.value)
                    }
                    placeholder="Sunday worship set"
                    type="text"
                    value={recordingForm.title}
                  />
                </label>
                <label>
                  Audio file
                  <input
                    accept="audio/*"
                    onChange={(event) =>
                      setSelectedAudioFile(event.target.files?.[0] || null)
                    }
                    type="file"
                  />
                </label>
                <label>
                  Songs
                  <textarea
                    onChange={(event) =>
                      updateRecordingForm("songs", event.target.value)
                    }
                    placeholder={"One song per line"}
                    rows="4"
                    value={recordingForm.songs}
                  />
                </label>
                <label>
                  Note
                  <textarea
                    onChange={(event) =>
                      updateRecordingForm("note", event.target.value)
                    }
                    placeholder="Optional note"
                    rows="4"
                    value={recordingForm.note}
                  />
                </label>
              </div>

              <button
                className="secondary-button"
                disabled={uploadingRecording || !selectedAudioFile}
                type="submit"
              >
                {uploadingRecording ? "Uploading..." : "Upload recording"}
              </button>
            </form>
          )}

          <div className="steadfast-recording-list">
            {loadingRecordings ? (
              <p className="empty-state">Loading recordings...</p>
            ) : recordings.length > 0 ? (
              recordings.map((recording) => (
                <article className="steadfast-recording-card" key={recording.id}>
                  <div className="steadfast-recording-copy">
                    <small>{formatRecordingDate(recording.recorded_on)}</small>
                    <h3>{recording.title}</h3>
                    {recording.songs.length > 0 && (
                      <ul>
                        {recording.songs.map((song) => (
                          <li key={song}>{song}</li>
                        ))}
                      </ul>
                    )}
                    {recording.note && <p>{recording.note}</p>}
                  </div>

                  <SteadfastAudioPlayer recording={recording} />
                </article>
              ))
            ) : (
              <p className="empty-state">
                No recordings have been uploaded yet.
              </p>
            )}
          </div>

        </section>
      </section>

      {isAdmin && adminMode && (
        <section className="masters-admin-panel">
          <details>
            <summary>
              <span>
                <small>Admin</small>
                <strong>Access Requests</strong>
              </span>
              <em>
                {accessRequests.filter((request) => request.status === "pending").length}{" "}
                pending
              </em>
            </summary>

            <div className="masters-admin-content">
              {accessError && <p className="form-message error">{accessError}</p>}
              {accessMessage && (
                <p className="form-message success">{accessMessage}</p>
              )}

              {loadingRequests ? (
                <p className="empty-state">Loading access requests...</p>
              ) : accessRequests.length === 0 ? (
                <p className="empty-state">No access requests yet.</p>
              ) : (
                <ul className="masters-access-request-list">
                  {accessRequests.map((request) => (
                    <li key={request.id}>
                      <div>
                        <strong>
                          {request.display_name || request.email || "Unknown user"}
                        </strong>
                        {request.email && <span>{request.email}</span>}
                        <small>Status: {request.status}</small>
                      </div>

                      {request.status === "pending" && (
                        <div className="row-actions">
                          <button
                            type="button"
                            onClick={() =>
                              reviewAccessRequest(request.id, "approved")
                            }
                          >
                            Approve
                          </button>
                          <button
                            className="subtle-danger-button"
                            type="button"
                            onClick={() =>
                              reviewAccessRequest(request.id, "rejected")
                            }
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        </section>
      )}
    </main>
  );
}

export default Steadfast;
