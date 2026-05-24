import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";

// Friends is the protected page where users manage sharing relationships.
// Accepted friends can be allowed to see each other's PDF songs, depending on
// the Supabase Row Level Security policies.
function Friends() {
  const { profile, user } = useAuth();

  // friendEmail is the email typed into the "Add friend" form.
  const [friendEmail, setFriendEmail] = useState("");

  // friendships holds rows from the Supabase "friendships" table.
  const [friendships, setFriendships] = useState([]);

  // loading controls the loading/empty/list UI.
  const [loading, setLoading] = useState(true);

  // message and error show feedback after actions.
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Load existing friend requests once when the page first appears.
    loadFriendships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFriendships() {
    setLoading(true);
    setError("");

    // RLS should limit this query to friendships involving the signed-in user.
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
    // Prevent a normal browser page refresh.
    event.preventDefault();
    setError("");
    setMessage("");

    // Normalize the email so matching is consistent.
    const addresseeEmail = friendEmail.trim().toLowerCase();

    if (!addresseeEmail) {
      setError("Enter your friend's email first.");
      return;
    }

    // You should not be able to friend yourself.
    if (addresseeEmail === user.email?.toLowerCase()) {
      setError("You cannot send a friend request to yourself.");
      return;
    }

    // Let the database do the profile lookup and request insert together.
    // This keeps the browser out of RLS-sensitive profile and friendship writes.
    const { error: requestError } = await supabase.rpc("send_friend_request", {
      addressee_email: addresseeEmail,
    });

    if (requestError) {
      setError(requestError.message);
    } else {
      // Clear the form and refresh the request list after success.
      setMessage("Friend request sent.");
      setFriendEmail("");
      await loadFriendships();
    }
  }

  async function updateRequest(friendship, status) {
    setError("");
    setMessage("");

    // Change a pending request to accepted or rejected.
    // RLS should make sure only the addressee can respond.
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
    // A friendship row stores two ids:
    // requester_id = who sent it
    // addressee_id = who received it
    // This helper figures out which id belongs to the other person.
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

                // Only the person who received a pending request can accept/reject.
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
