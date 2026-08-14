import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";

const sampleSongs = [
  { id: "sample-ancient", title: "Ancient of Days", song_key: "C", tags: ["Call to worship", "Upbeat"], notes: "" },
  { id: "sample-fount", title: "Come Thou Fount", song_key: "D", tags: ["Hymn", "Opening"], notes: "" },
  { id: "sample-mercy", title: "His Mercy Is More", song_key: "G", tags: ["Gospel", "Band"], notes: "" },
  { id: "sample-deep", title: "How Deep the Father's Love", song_key: "E", tags: ["Reflection"], notes: "" },
  { id: "sample-christ", title: "In Christ Alone", song_key: "D", tags: ["Core song", "Band"], notes: "" },
  { id: "sample-need", title: "Lord I Need You", song_key: "G", tags: ["Prayer"], notes: "" },
  { id: "sample-praise", title: "O Praise the Name", song_key: "A", tags: ["Closing"], notes: "" },
  { id: "sample-holy", title: "Only a Holy God", song_key: "E", tags: ["Adoration"], notes: "" },
  { id: "sample-yet", title: "Yet Not I But Through Christ in Me", song_key: "C", tags: ["Core song"], notes: "" },
];

const sampleSets = [
  {
    id: "sample-2026-08-21",
    service_date: "2026-08-21",
    leader: "Team lead",
    notes: "Keep transitions simple. Send charts by Wednesday night.",
  },
  {
    id: "sample-2026-08-14",
    service_date: "2026-08-14",
    leader: "Team lead",
    notes: "Acoustic-centered week. Keys are flexible if needed.",
  },
];

const sampleSetSongs = [
  { id: "sample-set-1", set_id: "sample-2026-08-21", title: "Come Thou Fount", song_key: "D", note: "Start with verse 1, full band on verse 2.", position: 0 },
  { id: "sample-set-2", set_id: "sample-2026-08-21", title: "Only a Holy God", song_key: "E", note: "Use this as the main teaching song.", position: 1 },
  { id: "sample-set-3", set_id: "sample-2026-08-21", title: "His Mercy Is More", song_key: "G", note: "Close with a lighter tempo.", position: 2 },
  { id: "sample-set-4", set_id: "sample-2026-08-14", title: "Ancient of Days", song_key: "C", note: "Medium tempo.", position: 0 },
  { id: "sample-set-5", set_id: "sample-2026-08-14", title: "How Deep the Father's Love", song_key: "E", note: "Quiet after the message.", position: 1 },
  { id: "sample-set-6", set_id: "sample-2026-08-14", title: "In Christ Alone", song_key: "D", note: "Strong ending.", position: 2 },
];

function cleanFileName(name) {
  return (
    name
      .toLowerCase()
      .replace(/\.pdf$/i, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "chart"
  );
}

function prefersPdfViewerWindow() {
  const userAgent = navigator.userAgent || "";

  return /Android|iPhone|iPad|iPod/i.test(userAgent);
}

function openPdfDownloadWindow() {
  if (!prefersPdfViewerWindow()) {
    return null;
  }

  return window.open("", "_blank");
}

function openPdfUrl(url, viewerWindow = null) {
  if (viewerWindow && !viewerWindow.closed) {
    viewerWindow.location.href = url;
    return;
  }

  if (prefersPdfViewerWindow()) {
    window.location.href = url;
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function formatTeamDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
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
        // Fall back to the client error below.
      }
    }
  }

  return error?.message || "Unexpected error.";
}

function normalizeTags(value) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function PspWorshipTeam() {
  const { user } = useAuth();
  const [songs, setSongs] = useState(sampleSongs);
  const [sets, setSets] = useState(sampleSets);
  const [weeklySetSongs, setWeeklySetSongs] = useState(sampleSetSongs);
  const [selectedSetId, setSelectedSetId] = useState(sampleSets[0].id);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [chartFiles, setChartFiles] = useState({});
  const [newSongChartFile, setNewSongChartFile] = useState(null);
  const [newSongFormVersion, setNewSongFormVersion] = useState(0);
  const [addingSong, setAddingSong] = useState(false);
  const [editingSongId, setEditingSongId] = useState("");
  const [editSong, setEditSong] = useState({
    notes: "",
    song_key: "",
    tags: "",
    title: "",
  });
  const [savingSongId, setSavingSongId] = useState("");
  const [uploadingChartId, setUploadingChartId] = useState("");
  const [downloadingSetId, setDownloadingSetId] = useState("");
  const [newSong, setNewSong] = useState({
    notes: "",
    song_key: "",
    tags: "",
    title: "",
  });
  const [newSet, setNewSet] = useState({
    leader: "",
    notes: "",
    service_date: "",
  });
  const [setSongForm, setSetSongForm] = useState({
    note: "",
    song_id: "",
  });

  const selectedSet = useMemo(
    () => sets.find((set) => set.id === selectedSetId) || sets[0] || null,
    [selectedSetId, sets]
  );

  const selectedSetSongs = useMemo(
    () =>
      selectedSet
        ? weeklySetSongs
            .filter((song) => song.set_id === selectedSet.id)
            .sort((firstSong, secondSong) => firstSong.position - secondSong.position)
        : [],
    [selectedSet, weeklySetSongs]
  );

  const filteredSongs = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();

    if (!cleanSearch) {
      return songs;
    }

    return songs.filter((song) => {
      const tags = Array.isArray(song.tags) ? song.tags.join(" ") : "";
      const searchableText = `${song.title} ${song.song_key} ${tags} ${song.notes}`.toLowerCase();

      return searchableText.includes(cleanSearch);
    });
  }, [searchTerm, songs]);

  const inviteText =
    "Here is this week's PSP Worship Team page: https://worthyforworship.com/psp-worship-team";

  const canManage = isAdmin && adminMode;

  useEffect(() => {
    if (user) {
      loadPspWorkspace();
    }
    // loadPspWorkspace is a local async loader that reads the current user id.
    // Re-run it only when the signed-in user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadPspWorkspace() {
    setLoading(true);
    setError("");

    const [memberResult, songsResult, setsResult, setSongsResult] = await Promise.all([
      supabase
        .from("psp_worship_team_members")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("psp_worship_team_songs")
        .select("id, title, song_key, tags, file_path, notes, created_at")
        .order("title", { ascending: true }),
      supabase
        .from("psp_worship_team_sets")
        .select("id, service_date, leader, notes, created_at")
        .order("service_date", { ascending: false }),
      supabase
        .from("psp_worship_team_set_songs")
        .select("id, set_id, song_id, title, song_key, note, position")
        .order("position", { ascending: true }),
    ]);

    if (memberResult.error || songsResult.error || setsResult.error || setSongsResult.error) {
      setError(
        "Showing starter content until the PSP Supabase tables are applied and your account has team access."
      );
      setLoading(false);
      return;
    }

    const loadedSets = setsResult.data || [];
    const memberRole = memberResult.data?.role || "";

    if (!memberRole) {
      setError("Your account is signed in, but it has not been added to PSP yet.");
    }

    setIsAdmin(memberRole === "admin");
    setSongs(songsResult.data || []);
    setSets(loadedSets);
    setWeeklySetSongs(setSongsResult.data || []);
    setSelectedSetId((currentSetId) =>
      loadedSets.some((set) => set.id === currentSetId)
        ? currentSetId
        : loadedSets[0]?.id || ""
    );
    setLoading(false);
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteText);
      setCopiedInvite(true);
      window.setTimeout(() => setCopiedInvite(false), 1800);
    } catch {
      setCopiedInvite(false);
    }
  }

  async function addTeamSong(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!isAdmin) {
      setError("Only PSP admins can add songs.");
      return;
    }

    const title = newSong.title.trim();

    if (!title) {
      setError("Add a song title first.");
      return;
    }

    if (newSongChartFile && newSongChartFile.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }

    setAddingSong(true);

    const { data: insertedSong, error: insertError } = await supabase
      .from("psp_worship_team_songs")
      .insert({
        notes: newSong.notes.trim(),
        song_key: newSong.song_key.trim(),
        tags: normalizeTags(newSong.tags),
        title,
      })
      .select("id, title")
      .single();

    if (insertError) {
      setError(insertError.message);
      setAddingSong(false);
      return;
    }

    if (newSongChartFile) {
      const formData = new FormData();
      const filePath = `${user.id}/psp-worship-team/charts/${insertedSong.id}-${cleanFileName(
        newSongChartFile.name
      )}.pdf`;

      formData.append("action", "upload");
      formData.append("filePath", filePath);
      formData.append("file", newSongChartFile);

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke(
        "r2-song-files",
        {
          body: formData,
        }
      );

      if (uploadError) {
        setError(
          `Song was added, but the chart PDF did not upload: ${await getFunctionErrorMessage(
            uploadError
          )}`
        );
        setAddingSong(false);
        await loadPspWorkspace();
        return;
      }

      const { error: updateError } = await supabase
        .from("psp_worship_team_songs")
        .update({ file_path: uploadData.filePath })
        .eq("id", insertedSong.id);

      if (updateError) {
        setError(`Song was added, but the chart PDF was not saved: ${updateError.message}`);
        setAddingSong(false);
        await loadPspWorkspace();
        return;
      }
    }

    setNewSong({ notes: "", song_key: "", tags: "", title: "" });
    setNewSongChartFile(null);
    setNewSongFormVersion((currentVersion) => currentVersion + 1);
    setAddingSong(false);
    setMessage(
      newSongChartFile
        ? "Song and chart added to the PSP library."
        : "Song added to the PSP library."
    );
    await loadPspWorkspace();
  }

  async function addWeeklySet(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!newSet.service_date) {
      setError("Choose a Friday date first.");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("psp_worship_team_sets")
      .insert({
        leader: newSet.leader.trim(),
        notes: newSet.notes.trim(),
        service_date: newSet.service_date,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setNewSet({ leader: "", notes: "", service_date: "" });
    setSelectedSetId(data.id);
    setMessage("Weekly set created.");
    await loadPspWorkspace();
  }

  async function addSongToSelectedSet(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selectedSet) {
      setError("Choose a Friday set first.");
      return;
    }

    const song = songs.find((currentSong) => currentSong.id === setSongForm.song_id);

    if (!song) {
      setError("Choose a song from the PSP library first.");
      return;
    }

    const nextPosition = selectedSetSongs.length;
    const { error: insertError } = await supabase
      .from("psp_worship_team_set_songs")
      .insert({
        note: setSongForm.note.trim(),
        position: nextPosition,
        set_id: selectedSet.id,
        song_id: song.id,
        song_key: song.song_key,
        title: song.title,
      });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSetSongForm({ note: "", song_id: "" });
    setMessage(`"${song.title}" added to this Friday set.`);
    await loadPspWorkspace();
  }

  async function openChart(song) {
    if (!song.file_path) {
      setError("This chart does not have a PDF uploaded yet.");
      return;
    }

    setError("");

    const { data, error: signedUrlError } = await supabase.functions.invoke(
      "r2-song-files",
      {
        body: {
          action: "psp-worship-team-chart-signed-url",
          songId: song.id,
        },
      }
    );

    if (signedUrlError) {
      setError(await getFunctionErrorMessage(signedUrlError));
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function uploadChart(song) {
    const file = chartFiles[song.id];

    setError("");
    setMessage("");

    if (!isAdmin) {
      setError("Only PSP admins can upload charts.");
      return;
    }

    if (!file) {
      setError("Choose a PDF before uploading.");
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }

    setUploadingChartId(song.id);

    const formData = new FormData();
    const filePath = `${user.id}/psp-worship-team/charts/${song.id}-${cleanFileName(
      file.name
    )}.pdf`;

    formData.append("action", "upload");
    formData.append("filePath", filePath);
    formData.append("file", file);

    const { data: uploadData, error: uploadError } = await supabase.functions.invoke(
      "r2-song-files",
      {
        body: formData,
      }
    );

    if (uploadError) {
      setError(await getFunctionErrorMessage(uploadError));
      setUploadingChartId("");
      return;
    }

    const { error: updateError } = await supabase
      .from("psp_worship_team_songs")
      .update({ file_path: uploadData.filePath })
      .eq("id", song.id);

    if (updateError) {
      setError(updateError.message);
      setUploadingChartId("");
      return;
    }

    setChartFiles((currentFiles) => {
      const nextFiles = { ...currentFiles };
      delete nextFiles[song.id];
      return nextFiles;
    });
    setUploadingChartId("");
    setMessage(`Chart uploaded for "${song.title}".`);
    await loadPspWorkspace();
  }

  function startEditingSong(song) {
    setEditingSongId(song.id);
    setEditSong({
      notes: song.notes || "",
      song_key: song.song_key || "",
      tags: Array.isArray(song.tags) ? song.tags.join(", ") : "",
      title: song.title || "",
    });
    setError("");
    setMessage("");
  }

  function cancelEditingSong() {
    setEditingSongId("");
    setEditSong({ notes: "", song_key: "", tags: "", title: "" });
  }

  async function saveSongEdits(event, song) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!isAdmin) {
      setError("Only PSP admins can edit songs.");
      return;
    }

    const title = editSong.title.trim();

    if (!title) {
      setError("Song title cannot be blank.");
      return;
    }

    setSavingSongId(song.id);

    const { error: updateError } = await supabase
      .from("psp_worship_team_songs")
      .update({
        notes: editSong.notes.trim(),
        song_key: editSong.song_key.trim(),
        tags: normalizeTags(editSong.tags),
        title,
      })
      .eq("id", song.id);

    if (updateError) {
      setError(updateError.message);
      setSavingSongId("");
      return;
    }

    setEditingSongId("");
    setEditSong({ notes: "", song_key: "", tags: "", title: "" });
    setSavingSongId("");
    setMessage(`"${title}" updated.`);
    await loadPspWorkspace();
  }

  async function downloadWeeklySetPdf(set) {
    const viewerWindow = openPdfDownloadWindow();

    setDownloadingSetId(set.id);
    setError("");
    setMessage("");

    const { data, error: pdfError } = await supabase.functions.invoke(
      "r2-song-files",
      {
        body: {
          action: "psp-worship-team-set-pdf",
          preferSignedUrl: true,
          setId: set.id,
        },
      }
    );

    if (pdfError) {
      viewerWindow?.close();
      setError(`Could not build the weekly PDF: ${await getFunctionErrorMessage(pdfError)}`);
      setDownloadingSetId("");
      return;
    }

    if (!data?.signedUrl) {
      viewerWindow?.close();
      setError("Could not build the weekly PDF: the server did not return a file.");
      setDownloadingSetId("");
      return;
    }

    openPdfUrl(data.signedUrl, viewerWindow);

    if (data.warnings?.length) {
      const warningNoun = data.warnings.length === 1 ? "chart" : "charts";
      const warningVerb = data.warnings.length === 1 ? "was" : "were";

      setMessage(
        `Weekly PDF opened. ${data.warnings.length} ${warningNoun} ${warningVerb} replaced with note pages.`
      );
    } else {
      setMessage("Weekly set PDF opened.");
    }

    setDownloadingSetId("");
  }

  return (
    <main className="page friday-team-page">
      <section className="friday-team-hero">
        <div>
          <p className="eyebrow">Team workspace</p>
          <h1>PSP Worship Team</h1>
          <p>
            A private place for a small worship team to pick weekly songs, open
            charts, and send one simple link before Friday.
          </p>
        </div>
        <div className="friday-team-share-card">
          <p className="eyebrow">Invite</p>
          <h2>Share the week</h2>
          <p>Copy a link for email or group messages.</p>
          <button className="secondary-button" type="button" onClick={copyInviteLink}>
            {copiedInvite ? "Copied" : "Copy email link"}
          </button>
        </div>
      </section>

      {message && <p className="form-message success">{message}</p>}
      {error && <p className="form-message error">{error}</p>}
      {loading && <p className="form-message">Loading PSP workspace...</p>}

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

      <section className="friday-team-shell" aria-label="PSP worship team tools">
        <aside className="friday-team-sidebar">
          <div className="friday-team-sidebar-heading">
            <h2>Fridays</h2>
            <p>Newest week first.</p>
          </div>

          <div className="friday-week-list">
            {sets.length === 0 ? (
              <p className="song-resource-muted">No weekly sets yet.</p>
            ) : (
              sets.map((set) => (
                <button
                  className={selectedSet?.id === set.id ? "active" : ""}
                  key={set.id}
                  type="button"
                  onClick={() => setSelectedSetId(set.id)}
                >
                  <strong>{formatTeamDate(set.service_date)}</strong>
                  <span>
                    {weeklySetSongs.filter((song) => song.set_id === set.id).length} songs
                  </span>
                </button>
              ))
            )}
          </div>

          {canManage && (
            <form className="friday-admin-form" onSubmit={addWeeklySet}>
              <strong>New week</strong>
              <label>
                Date
                <input
                  onChange={(event) =>
                    setNewSet((currentSet) => ({
                      ...currentSet,
                      service_date: event.target.value,
                    }))
                  }
                  type="date"
                  value={newSet.service_date}
                />
              </label>
              <label>
                Leader
                <input
                  onChange={(event) =>
                    setNewSet((currentSet) => ({
                      ...currentSet,
                      leader: event.target.value,
                    }))
                  }
                  placeholder="Team lead"
                  type="text"
                  value={newSet.leader}
                />
              </label>
              <label>
                Notes
                <textarea
                  onChange={(event) =>
                    setNewSet((currentSet) => ({
                      ...currentSet,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Weekly notes"
                  rows="3"
                  value={newSet.notes}
                />
              </label>
              <button className="primary-button" type="submit">
                Create week
              </button>
            </form>
          )}
        </aside>

        <section className="friday-team-main">
          {selectedSet ? (
            <>
              <div className="friday-set-heading">
                <div>
                  <p className="eyebrow">This week</p>
                  <h2>{formatTeamDate(selectedSet.service_date)}</h2>
                  <p>{selectedSet.notes || "No notes for this week yet."}</p>
                </div>
                <button
                  className="primary-button"
                  disabled={selectedSetSongs.length === 0 || downloadingSetId === selectedSet.id}
                  type="button"
                  onClick={() => downloadWeeklySetPdf(selectedSet)}
                >
                  {downloadingSetId === selectedSet.id ? "Building PDF..." : "Open weekly PDF"}
                </button>
              </div>

              {selectedSetSongs.length === 0 ? (
                <div className="library-empty-state">
                  <h3>No songs yet</h3>
                  <p>Add songs from the PSP chart library to build this set.</p>
                </div>
              ) : (
                <ol className="friday-set-list">
                  {selectedSetSongs.map((song, index) => (
                    <li key={song.id}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{song.title}</strong>
                        <p>{song.note || "No song note."}</p>
                      </div>
                      <em>{song.song_key || "Key?"}</em>
                    </li>
                  ))}
                </ol>
              )}

              {canManage && (
                <form className="friday-admin-form friday-set-song-form" onSubmit={addSongToSelectedSet}>
                  <strong>Add song to this set</strong>
                  <label>
                    Song
                    <select
                      onChange={(event) =>
                        setSetSongForm((currentForm) => ({
                          ...currentForm,
                          song_id: event.target.value,
                        }))
                      }
                      value={setSongForm.song_id}
                    >
                      <option value="">Choose song</option>
                      {songs.map((song) => (
                        <option key={song.id} value={song.id}>
                          {song.title} ({song.song_key || "No key"})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Note
                    <input
                      onChange={(event) =>
                        setSetSongForm((currentForm) => ({
                          ...currentForm,
                          note: event.target.value,
                        }))
                      }
                      placeholder="Intro, transition, capo, or band note"
                      type="text"
                      value={setSongForm.note}
                    />
                  </label>
                  <button className="primary-button" type="submit">
                    Add to set
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="library-empty-state">
              <h3>No week selected</h3>
              <p>Create or choose a Friday set to begin.</p>
            </div>
          )}
        </section>
      </section>

      <section className="friday-chart-library" aria-label="Shared chart library">
        <div className="friday-section-heading">
          <p className="eyebrow">Shared library</p>
          <h2>Team Charts</h2>
          <p>
            Search the reusable chart pool. This will become the team’s real
            50-song library as charts are added.
          </p>
        </div>

        <div className="friday-library-toolbar">
          <label>
            Search songs
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search title, key, tag, or note"
              type="search"
              value={searchTerm}
            />
          </label>
          <span>
            {filteredSongs.length} {filteredSongs.length === 1 ? "song" : "songs"}
          </span>
        </div>

        {canManage && (
          <form
            className="friday-admin-form friday-song-form"
            key={newSongFormVersion}
            onSubmit={addTeamSong}
          >
            <strong>Add song</strong>
            <label>
              Title
              <input
                onChange={(event) =>
                  setNewSong((currentSong) => ({
                    ...currentSong,
                    title: event.target.value,
                  }))
                }
                placeholder="Come Thou Fount"
                type="text"
                value={newSong.title}
              />
            </label>
            <label>
              Key
              <input
                onChange={(event) =>
                  setNewSong((currentSong) => ({
                    ...currentSong,
                    song_key: event.target.value,
                  }))
                }
                placeholder="D"
                type="text"
                value={newSong.song_key}
              />
            </label>
            <label>
              Tags
              <input
                onChange={(event) =>
                  setNewSong((currentSong) => ({
                    ...currentSong,
                    tags: event.target.value,
                  }))
                }
                placeholder="Hymn, Opening"
                type="text"
                value={newSong.tags}
              />
            </label>
            <label>
              Chart PDF
              <input
                accept="application/pdf"
                onChange={(event) => setNewSongChartFile(event.target.files?.[0] || null)}
                type="file"
              />
            </label>
            <label>
              Notes
              <textarea
                onChange={(event) =>
                  setNewSong((currentSong) => ({
                    ...currentSong,
                    notes: event.target.value,
                  }))
                }
                placeholder="Optional chart note"
                rows="3"
                value={newSong.notes}
              />
            </label>
            <button className="primary-button" disabled={addingSong} type="submit">
              {addingSong ? "Adding..." : "Add song"}
            </button>
          </form>
        )}

        {filteredSongs.length === 0 ? (
          <div className="library-empty-state">
            <h3>No songs found</h3>
            <p>Try a different search or add the first PSP chart.</p>
          </div>
        ) : (
          <div className="friday-chart-grid">
            {filteredSongs.map((song) => (
              <article className="friday-chart-card" key={song.id}>
                {editingSongId === song.id ? (
                  <form
                    className="friday-chart-edit-form"
                    onSubmit={(event) => saveSongEdits(event, song)}
                  >
                    <label>
                      Title
                      <input
                        onChange={(event) =>
                          setEditSong((currentSong) => ({
                            ...currentSong,
                            title: event.target.value,
                          }))
                        }
                        type="text"
                        value={editSong.title}
                      />
                    </label>
                    <label>
                      Key
                      <input
                        onChange={(event) =>
                          setEditSong((currentSong) => ({
                            ...currentSong,
                            song_key: event.target.value,
                          }))
                        }
                        placeholder="C, D, C-D..."
                        type="text"
                        value={editSong.song_key}
                      />
                    </label>
                    <label>
                      Tags
                      <input
                        onChange={(event) =>
                          setEditSong((currentSong) => ({
                            ...currentSong,
                            tags: event.target.value,
                          }))
                        }
                        placeholder="Hymn, Opening"
                        type="text"
                        value={editSong.tags}
                      />
                    </label>
                    <label>
                      Notes
                      <textarea
                        onChange={(event) =>
                          setEditSong((currentSong) => ({
                            ...currentSong,
                            notes: event.target.value,
                          }))
                        }
                        rows="3"
                        value={editSong.notes}
                      />
                    </label>
                    <div className="friday-chart-edit-actions">
                      <button
                        className="primary-button"
                        disabled={savingSongId === song.id}
                        type="submit"
                      >
                        {savingSongId === song.id ? "Saving..." : "Save"}
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={cancelEditingSong}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div>
                      <h3>{song.title}</h3>
                      <p>Key: {song.song_key || "No key yet"}</p>
                      {song.notes && <p>{song.notes}</p>}
                    </div>
                    <div className="friday-chart-tags">
                      {(Array.isArray(song.tags) ? song.tags : []).map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </>
                )}
                <button
                  className="secondary-button"
                  disabled={!song.file_path}
                  type="button"
                  onClick={() => openChart(song)}
                >
                  {song.file_path ? "Open chart" : "Chart coming soon"}
                </button>
                {canManage && (
                  <div className="friday-chart-upload">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => startEditingSong(song)}
                    >
                      Edit details
                    </button>
                    <label>
                      Chart PDF
                      <input
                        accept="application/pdf"
                        onChange={(event) =>
                          setChartFiles((currentFiles) => ({
                            ...currentFiles,
                            [song.id]: event.target.files?.[0] || null,
                          }))
                        }
                        type="file"
                      />
                    </label>
                    <button
                      className="secondary-button"
                      disabled={!chartFiles[song.id] || uploadingChartId === song.id}
                      type="button"
                      onClick={() => uploadChart(song)}
                    >
                      {uploadingChartId === song.id
                        ? "Uploading..."
                        : song.file_path
                          ? "Replace PDF"
                          : "Upload PDF"}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default PspWorshipTeam;
