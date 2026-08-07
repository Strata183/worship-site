import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import mastersBibleStudyWeeks from "../Data/mastersBibleStudyWeeks";

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
  const { weekSlug } = useParams();
  const newestWeek = sortedStudyWeeks[0];
  const selectedWeek = weekSlug
    ? sortedStudyWeeks.find((week) => week.date === weekSlug)
    : newestWeek;

  if (!selectedWeek && newestWeek) {
    return <Navigate replace to={`/masters-bible-study/${newestWeek.date}`} />;
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
    </main>
  );
}

export default MastersBibleStudy;
