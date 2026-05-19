import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";

function Friends() {
  const { profile, user } = useAuth();
  const [friendEmail, setFriendEmail] = useState("");
  const [friendships, setFriendships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadFriendships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFriendships() {
    setLoading(true);
    setError("");

    const { data, error: friendshipError } = await supabase
      .from("friendships")
      .select("*")
      .order("created_at", { ascending: false });

    if (friendshipError) {
      setError(friendshipError.message);
    } else {
      setFriendships(data || []);
    }

    setLoading(false);
  }

  async function sendRequest(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const addresseeEmail = friendEmail.trim().toLowerCase();

    if (!addresseeEmail) {
      setError("Enter your friend's email first.");
      return;
    }

    if (addresseeEmail === user.email?.toLowerCase()) {
      setError("You cannot send a friend request to yourself.");
      return;
    }

    const { data: friendProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", addresseeEmail)
      .maybeSingle();

    if (profileError) {
      setError(profileError.message);
      return;
    }

    if (!friendProfile) {
      setError("No account found with that email.");
      return;
    }

    const { error: insertError } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: friendProfile.id,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setMessage("Friend request sent.");
      setFriendEmail("");
      await loadFriendships();
    }
  }

  async function updateRequest(friendship, status) {
    setError("");
    setMessage("");

    const { error: updateError } = await supabase
      .from("friendships")
      .update({ status })
      .eq("id", friendship.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage(status === "accepted" ? "Friend request accepted." : "Request updated.");
      await loadFriendships();
    }
  }

  function describeFriendship(friendship) {
    const otherId =
      friendship.requester_id === user.id
        ? friendship.addressee_id
        : friendship.requester_id;
    const direction =
      friendship.requester_id === user.id ? "Request sent to" : "Request from";

    return { direction, otherId };
  }

  return (
    <main className="page app-page">
      <section className="page-heading">
        <p className="eyebrow">Sharing access</p>
        <h1>Friends</h1>
        <p>
          Add a friend by email, then accept each other to unlock PDF
          access.
        </p>
      </section>

      <section className="tool-layout">
        <section className="tool-panel">
          <h2>Your account</h2>
          <p className="profile-name">{profile?.display_name || user.email}</p>
          <code className="share-code">{user.email}</code>
        </section>

        <form className="tool-panel form-stack" onSubmit={sendRequest}>
          <h2>Add friend</h2>
          <label>
            Friend email
            <input
              autoComplete="email"
              onChange={(event) => setFriendEmail(event.target.value)}
              placeholder="friend@example.com"
              type="email"
              value={friendEmail}
            />
          </label>
          <button className="primary-button" type="submit">
            Send request
          </button>
          {message && <p className="form-message success">{message}</p>}
          {error && <p className="form-message error">{error}</p>}
        </form>

        <section className="tool-panel wide-panel">
          <div className="panel-header">
            <h2>Requests</h2>
            <button className="text-button" type="button" onClick={loadFriendships}>
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="empty-state">Loading friendships...</p>
          ) : friendships.length === 0 ? (
            <p className="empty-state">No friend requests yet.</p>
          ) : (
            <ul className="friend-list">
              {friendships.map((friendship) => {
                const { direction, otherId } = describeFriendship(friendship);
                const canRespond =
                  friendship.addressee_id === user.id &&
                  friendship.status === "pending";

                return (
                  <li key={friendship.id}>
                    <div>
                      <h3>{direction}</h3>
                      <code>{otherId}</code>
                      <p>Status: {friendship.status}</p>
                    </div>
                    {canRespond && (
                      <div className="row-actions">
                        <button
                          type="button"
                          onClick={() => updateRequest(friendship, "accepted")}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRequest(friendship, "rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    )}
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

export default Friends;
