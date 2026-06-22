import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";

// Turn a file name like "God of Light.pdf" into a safer storage name.
function cleanFileName(name) {
  return name
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Supabase Edge Function errors can contain useful details in the HTTP response.
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

function VbsKinderMusic() {
  const { user } = useAuth();
  const [charts, setCharts] = useState([]);
  const [title, setTitle] = useState("");
  const [songKey, setSongKey] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingChartId, setDeletingChartId] = useState("");
  const [deletingAllCharts, setDeletingAllCharts] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function checkAccess() {
      if (!user) {
        return;
      }

      const { data } = await supabase
        .from("vbs_kinder_access")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!ignore) {
        setIsUnlocked(Boolean(data));
        setCheckingAccess(false);
      }
    }

    checkAccess();

    return () => {
      ignore = true;
    };
  }, [user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const { error: accessError } = await supabase.rpc(
      "claim_vbs_kinder_access",
      {
        access_code: password,
      }
    );

    if (accessError) {
      setError(accessError.message);
      return;
    }

    setIsUnlocked(true);
    setPassword("");
  }

  const loadCharts = useCallback(async () => {
    if (!isUnlocked) {
      setCharts([]);
      return;
    }

    setLoadingCharts(true);
    setError("");

    const chartQuery = supabase
      .from("vbs_kinder_charts")
      .select("id, title, description, song_key, file_path, sort_order")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

    let { data, error: chartsError } = await chartQuery;

    if (chartsError) {
      const fallbackResult = await supabase
        .from("vbs_kinder_charts")
        .select("id, title, description, file_path, sort_order")
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });

      data = fallbackResult.data;
      chartsError = fallbackResult.error;
    }

    if (chartsError) {
      setError(chartsError.message);
      setCharts([]);
    } else {
      setCharts(data || []);
    }

    setLoadingCharts(false);
  }, [isUnlocked]);

  useEffect(() => {
    let ignore = false;

    async function loadIfCurrent() {
      await loadCharts();

      if (ignore) {
        setLoadingCharts(false);
      }
    }

    loadIfCurrent();

    return () => {
      ignore = true;
    };
  }, [loadCharts]);

  async function handleUpload(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    if (!user) {
      setError("You must be signed in to upload VBS charts.");
      setSubmitting(false);
      return;
    }

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

    const chartId = crypto.randomUUID();
    const safeName = cleanFileName(file.name) || "vbs-chart";
    const filePath = `${user.id}/vbs-kinder/${chartId}-${safeName}.pdf`;
    const chartTitle = title.trim() || file.name.replace(/\.pdf$/i, "");
    const parsedSortOrder = Number.parseInt(sortOrder, 10);

    const formData = new FormData();

    formData.append("action", "upload");
    formData.append("filePath", filePath);
    formData.append("file", file);

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

    const { error: insertError } = await supabase
      .from("vbs_kinder_charts")
      .insert({
        id: chartId,
        title: chartTitle,
        description: description.trim(),
        song_key: songKey,
        file_path: filePath,
        sort_order: Number.isNaN(parsedSortOrder) ? charts.length + 1 : parsedSortOrder,
      });

    if (insertError) {
      setError(`Chart save failed: ${insertError.message}`);
    } else {
      setMessage("VBS chart uploaded.");
      setTitle("");
      setSongKey("");
      setDescription("");
      setSortOrder("");
      setFile(null);
      event.target.reset();
      await loadCharts();
    }

    setSubmitting(false);
  }

  async function openChart(chart) {
    setError("");

    const signedUrl = await getChartSignedUrl(chart);

    if (signedUrl) {
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function getChartSignedUrl(chart) {
    const { data, error: signedUrlError } = await supabase.functions.invoke(
      "r2-song-files",
      {
        body: {
          action: "vbs-kinder-signed-url",
          chartId: chart.id,
        },
      }
    );

    if (signedUrlError) {
      setError(await getFunctionErrorMessage(signedUrlError));
      return "";
    }

    setError("");
    return data.signedUrl;
  }

  async function deleteChart(chart) {
    const confirmed = window.confirm(
      `Delete "${chart.title}" from the VBS chart list and Cloudflare storage?`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");
    setDeletingChartId(chart.id);

    const { data: deletedRows, error: deleteError } = await supabase
      .from("vbs_kinder_charts")
      .delete()
      .eq("id", chart.id)
      .select("id");

    if (deleteError) {
      setError(
        `Chart row delete failed: ${deleteError.message}. Make sure the temporary delete migration has been applied.`
      );
      setDeletingChartId("");
      return;
    }

    if (!deletedRows?.length) {
      setError("No chart row was deleted. Refresh the page and try again.");
      setDeletingChartId("");
      return;
    }

    setCharts((currentCharts) =>
      currentCharts.filter((currentChart) => currentChart.id !== chart.id)
    );

    const { error: storageError } = await supabase.functions.invoke(
      "r2-song-files",
      {
        body: {
          action: "vbs-kinder-delete",
          filePath: chart.file_path,
        },
      }
    );

    if (storageError) {
      setError(
        `Chart removed from the VBS page, but PDF cleanup failed: ${await getFunctionErrorMessage(storageError)}`
      );
      setDeletingChartId("");
      return;
    }

    setMessage("VBS chart deleted.");
    setDeletingChartId("");
  }

  async function deleteAllCharts() {
    const confirmed = window.confirm(
      `Delete all ${charts.length} VBS charts from the page? This is meant for clearing the old set before uploading the new one.`
    );

    if (!confirmed) {
      return;
    }

    const chartIds = charts.map((chart) => chart.id);
    const filePaths = charts.map((chart) => chart.file_path).filter(Boolean);

    setError("");
    setMessage("");
    setDeletingAllCharts(true);

    const { data: deletedRows, error: deleteError } = await supabase
      .from("vbs_kinder_charts")
      .delete()
      .in("id", chartIds)
      .select("id");

    if (deleteError) {
      setError(
        `Old chart cleanup failed: ${deleteError.message}. Make sure the temporary delete migration has been applied.`
      );
      setDeletingAllCharts(false);
      return;
    }

    setCharts([]);

    const storageResults = await Promise.all(
      filePaths.map((filePath) =>
        supabase.functions.invoke("r2-song-files", {
          body: {
            action: "vbs-kinder-delete",
            filePath,
          },
        })
      )
    );

    const failedStorageDeletes = storageResults.filter(
      (result) => result.error
    );

    if (failedStorageDeletes.length > 0) {
      setError(
        `${deletedRows?.length || 0} old chart rows were removed from the page, but ${failedStorageDeletes.length} Cloudflare PDF cleanup request failed.`
      );
    } else {
      setMessage(`${deletedRows?.length || 0} old VBS charts deleted.`);
    }

    setDeletingAllCharts(false);
  }

  if (checkingAccess) {
    return (
      <main className="page page-vbs">
        <p>Checking VBS access...</p>
      </main>
    );
  }

  if (!isUnlocked) {
    return (
      <main className="page page-vbs">
        <section className="vbs-hero">
          <p className="eyebrow">Team resources</p>
          <h1>VBS 2026, Kinder Music</h1>
          <p>
            Enter the team password once to unlock this page for your account.
          </p>
        </section>

        <form className="vbs-password-panel form-stack" onSubmit={handleSubmit}>
          <label htmlFor="vbs-password">Password</label>
          <input
            id="vbs-password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />

          {error && <p className="form-message error">{error}</p>}

          <button className="primary-button" type="submit">
            Open VBS charts
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="page page-vbs">
      <section className="vbs-hero">
        <div className="vbs-hero-copy">
          <p className="eyebrow">Team resources</p>
          <h1>VBS 2026, Kinder Music</h1>
          <p>Charts and practice resources for the Kinder music team.</p>
        </div>

        <div className="vbs-hero-actions">
          <span>{charts.length} {charts.length === 1 ? "chart" : "charts"}</span>
        </div>
      </section>

      <section className="vbs-chart-panel">
        <div className="vbs-panel-heading">
          <div>
            <p className="eyebrow">Private PDFs</p>
            <h2>Charts</h2>
          </div>
          <span>Links expire shortly after opening.</span>
        </div>

        {error && <p className="form-message error">{error}</p>}
        {message && <p className="form-message success">{message}</p>}

        {charts.length > 0 && (
          <div className="vbs-cleanup-tools">
            <button
              className="danger-button"
              disabled={deletingAllCharts}
              type="button"
              onClick={deleteAllCharts}
            >
              {deletingAllCharts ? "Deleting old charts..." : "Delete all old charts"}
            </button>
          </div>
        )}

        <form className="vbs-upload-form form-stack" onSubmit={handleUpload}>
          <div className="vbs-upload-heading">
            <h3>Temporary chart upload</h3>
            <p>Add VBS PDFs here while building the chart list.</p>
          </div>

          <label>
            Song title
            <input
              onChange={(event) => setTitle(event.target.value)}
              placeholder="God of Light"
              type="text"
              value={title}
            />
          </label>

          <label>
            Key
            <select
              onChange={(event) => setSongKey(event.target.value)}
              value={songKey}
            >
              <option value="">Choose key</option>
              {songKeyOptions.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </label>

          <label>
            Order
            <input
              min="0"
              onChange={(event) => setSortOrder(event.target.value)}
              placeholder={String(charts.length + 1)}
              type="number"
              value={sortOrder}
            />
          </label>

          <label>
            PDF file
            <input
              accept="application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              type="file"
            />
          </label>

          <label>
            Description
            <input
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Kinder lead sheet"
              type="text"
              value={description}
            />
          </label>

          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? "Uploading..." : "Upload chart"}
          </button>
        </form>

        {loadingCharts ? (
          <p className="empty-state">Loading charts...</p>
        ) : charts.length > 0 ? (
          <ul className="vbs-chart-list">
            {charts.map((chart, index) => (
              <li key={chart.id}>
                <div className="vbs-chart-row">
                  <span className="vbs-chart-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="vbs-chart-copy">
                    <strong>{chart.title}</strong>
                    <span>
                      {[chart.song_key && `Key of ${chart.song_key}`, chart.description]
                        .filter(Boolean)
                        .join(" - ")}
                    </span>
                  </span>
                  <span className="vbs-chart-actions">
                    <button type="button" onClick={() => openChart(chart)}>
                      Open
                    </button>
                    <button
                      className="danger-button"
                      disabled={deletingChartId === chart.id}
                      type="button"
                      onClick={() => deleteChart(chart)}
                    >
                      {deletingChartId === chart.id ? "Deleting..." : "Delete"}
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            This account is eligible. Charts will appear here when they are
            added.
          </p>
        )}
      </section>
    </main>
  );
}

export default VbsKinderMusic;
