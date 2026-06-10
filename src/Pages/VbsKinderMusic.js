import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";

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
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(false);
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

        {loadingCharts ? (
          <p className="empty-state">Loading charts...</p>
        ) : charts.length > 0 ? (
          <ul className="vbs-chart-list">
            {charts.map((chart, index) => (
              <li key={chart.id}>
                <button type="button" onClick={() => openChart(chart)}>
                  <span className="vbs-chart-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="vbs-chart-copy">
                    <strong>{chart.title}</strong>
                    <span>{chart.description}</span>
                  </span>
                  <span className="vbs-chart-action">Open</span>
                </button>
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
