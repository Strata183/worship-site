import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../AuthContext";
import mastersBibleStudyWeeks from "../Data/mastersBibleStudyWeeks";
import { supabase } from "../supabaseClient";

const sortedStudyWeeks = [...mastersBibleStudyWeeks].sort(
  (firstWeek, secondWeek) => new Date(secondWeek.date) - new Date(firstWeek.date)
);

function formatStudyDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function SongSheetPdf({ dateLabel, pdfPath }) {
  const [pdfStatus, setPdfStatus] = useState(pdfPath ? "checking" : "missing");

  useEffect(() => {
    let ignoreResponse = false;

    if (!pdfPath) {
      setPdfStatus("missing");
      return () => {
        ignoreResponse = true;
      };
    }

    setPdfStatus("checking");

    fetch(pdfPath, { method: "HEAD", cache: "no-store" })
      .then((response) => {
        const contentType = response.headers.get("content-type") || "";
        const isPdf =
          response.ok &&
          (contentType.includes("application/pdf") ||
            contentType.includes("application/octet-stream"));

        if (!ignoreResponse) {
          setPdfStatus(isPdf ? "ready" : "missing");
        }
      })
      .catch(() => {
        if (!ignoreResponse) {
          setPdfStatus("missing");
        }
      });

    return () => {
      ignoreResponse = true;
    };
  }, [pdfPath]);

  if (pdfStatus === "checking") {
    return <p className="masters-pdf-empty">Checking for this week's PDF...</p>;
  }

  if (pdfStatus === "missing") {
    return (
      <p className="masters-pdf-empty">
        Upload this week's song sheet PDF to show it here.
      </p>
    );
  }

  return (
    <div className="masters-pdf-viewer">
      <div className="masters-pdf-heading">
        <h4>Weekly Song Sheet PDF</h4>
        <a href={pdfPath} rel="noopener noreferrer" target="_blank">
          Open PDF
        </a>
      </div>
      <iframe src={pdfPath} title={`${dateLabel} song sheet`} />
    </div>
  );
}

function NoteBody({ body }) {
  if (Array.isArray(body)) {
    return (
      <ul>
        {body.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  return <p>{body}</p>;
}

function MastersBibleStudy() {
  const { user } = useAuth();
  const { weekSlug } = useParams();
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState("");
  const [accessMessage, setAccessMessage] = useState("");
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [requestStatus, setRequestStatus] = useState("");
  const [accessRequests, setAccessRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const newestWeek = sortedStudyWeeks[0];
  const selectedWeek = weekSlug
    ? sortedStudyWeeks.find((week) => week.date === weekSlug)
    : newestWeek;

  const loadAccessRequests = useCallback(async () => {
    setLoadingRequests(true);

    const { data, error } = await supabase.rpc(
      "list_masters_bible_study_access_requests"
    );

    if (error) {
      setAccessError(error.message);
      setAccessRequests([]);
    } else {
      setAccessRequests(data || []);
    }

    setLoadingRequests(false);
  }, []);

  const loadAccessState = useCallback(async () => {
    if (!user) {
      return { error: "", unlocked: false };
    }

    setCheckingAccess(true);

    const [accessResult, adminResult, requestResult] = await Promise.all([
      supabase.rpc("has_masters_bible_study_access"),
      supabase.rpc("is_masters_bible_study_admin", {
        user_id: user.id,
      }),
      supabase.rpc("get_masters_bible_study_access_request_status"),
    ]);

    const accessStateError =
      accessResult.error || adminResult.error || requestResult.error;

    if (accessStateError) {
      setAccessError(accessStateError.message);
      setCheckingAccess(false);
      return { error: accessStateError.message, unlocked: false };
    }

    const nextIsAdmin = Boolean(adminResult.data);
    let nextIsUnlocked = Boolean(accessResult.data);

    if (!nextIsUnlocked) {
      const { data: savedAccess } = await supabase
        .from("masters_bible_study_access")
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

    return { error: "", unlocked: nextIsUnlocked };
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

  async function handleAccessSubmit(event) {
    event.preventDefault();
    setAccessError("");
    setAccessMessage("");

    const { data, error } = await supabase.rpc(
      "claim_masters_bible_study_access",
      {
        access_code: accessCode,
      }
    );

    if (error) {
      setAccessError(error.message);
      return;
    }

    setAccessCode("");

    if (data) {
      setIsUnlocked(true);
      setAccessMessage("Access unlocked.");
      loadAccessState();
      return;
    }

    const savedAccess = await loadAccessState();

    if (savedAccess.unlocked) {
      setAccessMessage("Access unlocked.");
    } else if (!savedAccess.error) {
      setAccessError(
        "The password worked, but saved access was not found. Check that the latest Supabase migration has been applied."
      );
    }
  }

  async function requestAccess() {
    setAccessError("");
    setAccessMessage("");

    const { error } = await supabase.rpc("request_masters_bible_study_access");

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

    const { error } = await supabase.rpc(
      "review_masters_bible_study_access_request",
      {
        request_id: requestId,
        next_status: nextStatus,
      }
    );

    if (error) {
      setAccessError(error.message);
      return;
    }

    setAccessMessage(`Request ${nextStatus}.`);
    loadAccessRequests();
  }

  if (!selectedWeek && newestWeek) {
    return <Navigate replace to={`/masters-bible-study/${newestWeek.date}`} />;
  }

  if (checkingAccess) {
    return (
      <main className="page page-masters-study">
        <p>Checking Master&apos;s Bible Study access...</p>
      </main>
    );
  }

  if (!isUnlocked) {
    return (
      <main className="page page-masters-study">
        <section className="masters-hero">
          <p className="eyebrow">Weekly gathering</p>
          <h1>Master&apos;s Bible Study</h1>
          <p>
            Enter the Bible study password or request access for your account.
          </p>
        </section>

        <section className="masters-access-panel">
          <form className="form-stack" onSubmit={handleAccessSubmit}>
            <label htmlFor="masters-access-code">Password</label>
            <input
              id="masters-access-code"
              onChange={(event) => setAccessCode(event.target.value)}
              type="password"
              value={accessCode}
            />

            <button className="primary-button" type="submit">
              Unlock Bible study
            </button>
          </form>

          <div className="masters-request-access">
            <h2>Need access?</h2>
            <p>
              Send a request and an approved admin can unlock this page for your
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
    <main className="page page-masters-study">
      <section className="masters-hero">
        <p className="eyebrow">Weekly gathering</p>
        <h1>Master's Bible Study</h1>
        <p>
          A weekly home for songs, prayer requests, and notes from the Master's
          Bible study.
        </p>
      </section>

      <section className="masters-shell" aria-label="Bible study weeks">
        <aside className="masters-date-nav" aria-label="Bible study dates">
          <h2>Dates</h2>
          <ol>
            {sortedStudyWeeks.map((week, weekIndex) => (
              <li key={week.date}>
                <Link
                  className={week.date === selectedWeek.date ? "active" : ""}
                  to={`/masters-bible-study/${week.date}`}
                >
                  <span>{formatStudyDate(week.date)}</span>
                  {weekIndex === 0 && <small>Newest</small>}
                </Link>
              </li>
            ))}
          </ol>
        </aside>

        <section className="masters-week-view">
          <header className="masters-week-heading">
            <p className="eyebrow">
              {selectedWeek.date === newestWeek.date ? "Newest Week" : "Selected Week"}
            </p>
            <h2>{formatStudyDate(selectedWeek.date)}</h2>
          </header>

          <section
            className="masters-dashboard"
            aria-label={`${selectedWeek.date} resources`}
          >
            <section className="masters-panel masters-song-panel">
              <div className="masters-panel-heading">
                <p className="eyebrow">This Week</p>
                <h3>Song Sheets</h3>
              </div>

              <div className="masters-song-list">
                {selectedWeek.songs.map((song) => (
                  <article className="masters-song-card" key={song.title}>
                    <div className="masters-song-title">
                      <h4>{song.title}</h4>
                      <span>{song.key}</span>
                    </div>
                  </article>
                ))}
              </div>

              <SongSheetPdf
                dateLabel={formatStudyDate(selectedWeek.date)}
                pdfPath={selectedWeek.songSheetPdf}
              />
            </section>

            <section className="masters-panel">
              <div className="masters-panel-heading">
                <p className="eyebrow">Study</p>
                <h3>Notes</h3>
              </div>

              <div className="masters-notes-list">
                {selectedWeek.notes.map((note) => (
                  <article key={note.title}>
                    <h4>{note.title}</h4>
                    <NoteBody body={note.body} />
                  </article>
                ))}
              </div>
            </section>

            <section className="masters-panel">
              <div className="masters-panel-heading">
                <p className="eyebrow">Together</p>
                <h3>Prayer Requests</h3>
              </div>

              <div className="masters-prayer-list">
                {selectedWeek.prayerRequests.map((group) => (
                  <article key={group.name}>
                    <h4>{group.name}</h4>
                    <ul>
                      {group.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </section>
      </section>

      {isAdmin && (
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

export default MastersBibleStudy;
