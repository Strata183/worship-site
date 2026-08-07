import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";

// Steadfast is a group-specific resource page.
function Steadfast() {
  const { user } = useAuth();
  const [accessCode, setAccessCode] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [requestStatus, setRequestStatus] = useState("");
  const [accessRequests, setAccessRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [accessMessage, setAccessMessage] = useState("");

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
          <h1>Welcome, Steadfast!</h1>
          <p>
            Thank you for making your way to this new website as I continue
            developing it for the local church.
          </p>
        </div>
      </section>

      <section className="steadfast-content" aria-label="Steadfast resources">
        <section className="steadfast-section">
          <h2>Start here</h2>
          <p>
            If you have not already, go ahead and check out the{" "}
            <Link to="/about">About</Link> section, where I explain the point
            of this website and what I am trying to accomplish in more depth.
          </p>
          <p>
            Long story short, my desire is that the local church would be more
            united in song choices and, ultimately, in proper worship.
          </p>
          <p>
            This page is specifically for Steadfast, so it will make the most
            sense if you are part of the Steadfast fellowship group at Grace
            Community Church.
          </p>
        </section>

        <section className="steadfast-section steadfast-callout">
          <h2>Helpful prerequisites for service</h2>
          <p>
            If you serve with me, I would love for us to be united around a few
            prerequisites since we will be facilitating and leading worship.
            These are simply resources; they are not what make someone eligible
            to serve. My goal is unity.
          </p>
          <p>
            To start, please take some time to read{" "}
            <Link to="/articles/what-is-worship">What is worship?</Link>
          </p>
          <p>
            If we are going to lead worship, it is only fair that we know what
            worship is.
          </p>
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

export default Steadfast;
