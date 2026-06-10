import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";

// Turn a file name like "VBS Song (Key of C).pdf" into a safer storage name.
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

function VbsKinderMusic() {
  const { user } = useAuth();
  const [charts, setCharts] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  useEffect(() => {
    let ignore = false;

    async function loadCharts() {
      if (!isUnlocked) {
        setCharts([]);
        return;
      }

      setLoadingCharts(true);
      setError("");

      const { data, error: chartsError } = await supabase
        .from("vbs_kinder_charts")
        .select("id, title, description, sort_order")
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });

      if (ignore) {
        return;
      }

      if (chartsError) {
        setError(chartsError.message);
        setCharts([]);
      } else {
        setCharts(data || []);
      }

      setLoadingCharts(false);
    }

    loadCharts();

    return () => {
      ignore = true;
    };
  }, [isUnlocked]);

  async function openChart(chart) {
    setError("");

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
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
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

    const chartId = crypto.randomUUID();
    const safeName = cleanFileName(file.name) || "vbs-chart";
    const filePath = `${user.id}/vbs-2026-kinder/${chartId}-${safeName}.pdf`;
    const chartTitle = title.trim() || file.name.replace(/\.pdf$/i, "");
    const chartDescription = description.trim() || "VBS 2026 Kinder Music chart";

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

    const nextSortOrder =
      charts.reduce((highest, chart) => Math.max(highest, chart.sort_order || 0), 0) + 1;

    const { error: insertError } = await supabase.from("vbs_kinder_charts").insert({
      id: chartId,
      title: chartTitle,
      description: chartDescription,
      file_path: filePath,
      sort_order: nextSortOrder,
    });

    if (insertError) {
      setError(`Chart save failed: ${insertError.message}`);
    } else {
      setMessage("VBS chart uploaded.");
      setTitle("");
      setDescription("");
      setFile(null);
      event.target.reset();
      setCharts((currentCharts) => [
        ...currentCharts,
        {
          id: chartId,
          title: chartTitle,
          description: chartDescription,
          sort_order: nextSortOrder,
        },
      ]);
    }

    setSubmitting(false);
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
        <p className="eyebrow">Team resources</p>
        <h1>VBS 2026, Kinder Music</h1>
        <p>Charts and practice resources for the Kinder music team.</p>
      </section>

      <form className="vbs-upload-panel form-stack" onSubmit={handleUpload}>
        <div>
          <h2>Add VBS Chart</h2>
          <p>Temporary upload form for adding Kinder team PDFs.</p>
        </div>
        <label>
          Chart title
          <input
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Jesus Loves Me"
            type="text"
            value={title}
          />
        </label>
        <label>
          Description
          <input
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Key of C - rehearsal chart"
            type="text"
            value={description}
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
          {submitting ? "Uploading..." : "Upload VBS chart"}
        </button>
        {message && <p className="form-message success">{message}</p>}
      </form>

      <section className="vbs-chart-panel">
        <h2>Charts</h2>

        {error && <p className="form-message error">{error}</p>}

        {loadingCharts ? (
          <p className="empty-state">Loading charts...</p>
        ) : charts.length > 0 ? (
          <ul className="vbs-chart-list">
            {charts.map((chart) => (
              <li key={chart.id}>
                <button type="button" onClick={() => openChart(chart)}>
                  <strong>{chart.title}</strong>
                  <span>{chart.description}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            This account is eligible. Add VBS chart rows in Supabase to show
            them here.
          </p>
        )}
      </section>
    </main>
  );
}

export default VbsKinderMusic;
