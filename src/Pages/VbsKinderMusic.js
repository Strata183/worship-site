import { useCallback, useEffect, useState } from "react";
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
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [requestStatus, setRequestStatus] = useState("");
  const [accessRequests, setAccessRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const loadAccessRequests = useCallback(async () => {
    setLoadingRequests(true);

    const { data, error: requestsError } = await supabase.rpc(
      "list_vbs_kinder_access_requests"
    );

    if (requestsError) {
      setError(requestsError.message);
      setAccessRequests([]);
    } else {
      setAccessRequests(data || []);
    }

    setLoadingRequests(false);
  }, []);

  const loadAccessState = useCallback(async () => {
    if (!user) {
      return;
    }

    setCheckingAccess(true);

    const [accessResult, adminResult, requestResult] = await Promise.all([
      supabase.rpc("has_vbs_kinder_access"),
      supabase.rpc("is_vbs_kinder_admin", {
        user_id: user.id,
      }),
      supabase.rpc("get_vbs_kinder_access_request_status"),
    ]);

    const accessStateError =
      accessResult.error || adminResult.error || requestResult.error;

    if (accessStateError) {
      setError(accessStateError.message);
      setCheckingAccess(false);
      return;
    }

    const nextIsAdmin = Boolean(adminResult.data);
    let nextIsUnlocked = Boolean(accessResult.data);

    if (!nextIsUnlocked) {
      const { data: savedAccess } = await supabase
        .from("vbs_kinder_access")
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

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const { data, error: accessError } = await supabase.rpc(
      "claim_vbs_kinder_access",
      {
        access_code: password,
      }
    );

    if (accessError) {
      setError(accessError.message);
      return;
    }

    setPassword("");

    if (data) {
      setIsUnlocked(true);
      setMessage("Access unlocked.");
      loadAccessState();
    } else {
      setError("The password worked, but saved access was not found.");
    }
  }

  async function requestAccess() {
    setError("");
    setMessage("");

    const { error: requestError } = await supabase.rpc(
      "request_vbs_kinder_access"
    );

    if (requestError) {
      setError(requestError.message);
      return;
    }

    setRequestStatus("pending");
    setMessage("Access request sent.");
  }

  async function reviewAccessRequest(requestId, nextStatus) {
    setError("");
    setMessage("");

    const { error: reviewError } = await supabase.rpc(
      "review_vbs_kinder_access_request",
      {
        request_id: requestId,
        next_status: nextStatus,
      }
    );

    if (reviewError) {
      setError(reviewError.message);
      return;
    }

    setMessage(`Request ${nextStatus}.`);
    loadAccessRequests();
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
      .select("id, title, description, song_key, sort_order")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

    let { data, error: chartsError } = await chartQuery;

    if (chartsError) {
      const fallbackResult = await supabase
        .from("vbs_kinder_charts")
        .select("id, title, description, sort_order")
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
            Enter the team password or request access for your account.
          </p>
        </section>

        <section className="vbs-password-panel">
          <form className="form-stack" onSubmit={handleSubmit}>
            <label htmlFor="vbs-password">Password</label>
            <input
              id="vbs-password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />

            <button className="primary-button" type="submit">
              Open VBS charts
            </button>
          </form>

          <div className="masters-request-access">
            <h2>Need access?</h2>
            <p>
              Send a request and a VBS admin can unlock this page for your
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

          {error && <p className="form-message error">{error}</p>}
          {message && <p className="form-message success">{message}</p>}
        </section>
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
                <div className="vbs-chart-row">
                  <span className="vbs-chart-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="vbs-chart-copy">
                    <strong>{chart.title}</strong>
                    <span className="vbs-chart-meta">
                      {chart.song_key && (
                        <span className="vbs-chart-key">
                          Key: {chart.song_key}
                        </span>
                      )}
                      {chart.description && <span>{chart.description}</span>}
                    </span>
                  </span>
                  <span className="vbs-chart-actions">
                    <button type="button" onClick={() => openChart(chart)}>
                      Open
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

      {isAdmin && (
        <section className="vbs-chart-panel masters-admin-panel">
          <div className="masters-panel-heading">
            <p className="eyebrow">Admin</p>
            <h2>Access Requests</h2>
          </div>

          {error && <p className="form-message error">{error}</p>}
          {message && <p className="form-message success">{message}</p>}

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
                        onClick={() => reviewAccessRequest(request.id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        className="subtle-danger-button"
                        type="button"
                        onClick={() => reviewAccessRequest(request.id, "rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}

export default VbsKinderMusic;
