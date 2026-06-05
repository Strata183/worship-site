import { useEffect, useMemo, useState } from "react";
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

    // Load friendships with the other person's profile details included.
    const { data, error: friendshipError } = await supabase.rpc(
      "list_friendships_with_profiles"
    );

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

  // Split one friendship list into page sections so Friends feels like a
  // relationship manager instead of a notification center.
  const friendshipGroups = useMemo(
    () =>
      friendships.reduce(
        (groups, friendship) => {
          if (friendship.status === "accepted") {
            groups.accepted.push(friendship);
          } else if (
            friendship.status === "pending" &&
            friendship.addressee_id === user.id
          ) {
            groups.incoming.push(friendship);
          } else if (
            friendship.status === "pending" &&
            friendship.requester_id === user.id
          ) {
            groups.sent.push(friendship);
          } else {
            groups.other.push(friendship);
          }

          return groups;
        },
        {
          accepted: [],
          incoming: [],
          other: [],
          sent: [],
        }
      ),
    [friendships, user.id]
  );

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

    return {
      direction,
      otherId,
      otherName: friendship.other_display_name || friendship.other_email || otherId,
      otherEmail: friendship.other_email,
    };
  }

  function renderPersonMeta(friendship, label) {
    const { otherEmail, otherName } = describeFriendship(friendship);

    return (
      <div className="friend-person">
        <span className="friend-avatar" aria-hidden="true">
          {otherName.charAt(0).toUpperCase()}
        </span>
        <div>
          <h3>{otherName}</h3>
          {otherEmail && <code>{otherEmail}</code>}
          {label && <p>{label}</p>}
        </div>
      </div>
    );
  }

  return (
    <main className="page app-page friends-page">
      <section className="page-heading">
        <p className="eyebrow">Sharing access</p>
        <h1>Friends</h1>
        <p>
          Add a friend by email, then accept each other to unlock PDF
          access.
        </p>
      </section>

      <section className="friend-dashboard">
        <section className="friend-summary-card">
          <h2>Your account</h2>
          <div className="friend-person">
            <span className="friend-avatar" aria-hidden="true">
              {(profile?.display_name || user.email).charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="profile-name">{profile?.display_name || user.email}</p>
              <code>{user.email}</code>
            </div>
          </div>
        </section>

        <form className="friend-summary-card form-stack" onSubmit={sendRequest}>
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
      </section>

      <section className="friend-workspace">
        <section className="friend-section friend-section-primary">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Shared libraries</p>
              <h2>Friends</h2>
            </div>
            <span className="friend-count">{friendshipGroups.accepted.length}</span>
          </div>

          {loading ? (
            <p className="empty-state">Loading friendships...</p>
          ) : friendshipGroups.accepted.length === 0 ? (
            <div className="friend-empty-state">
              <h3>No friends yet</h3>
              <p>Accepted friends will appear here after a request is approved.</p>
            </div>
          ) : (
            <ul className="friend-list">
              {friendshipGroups.accepted.map((friendship) => {
                return (
                  <li key={friendship.id}>
                    {renderPersonMeta(friendship, "Library sharing is active.")}
                    <span className="status-pill accepted">Accepted</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="friend-section">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Needs response</p>
              <h2>Incoming requests</h2>
            </div>
            <button className="text-button" type="button" onClick={loadFriendships}>
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="empty-state">Loading requests...</p>
          ) : friendshipGroups.incoming.length === 0 ? (
            <p className="empty-state">No incoming requests.</p>
          ) : (
            <ul className="friend-list compact-friend-list">
              {friendshipGroups.incoming.map((friendship) => (
                <li key={friendship.id}>
                  {renderPersonMeta(friendship, "Wants to share library access.")}
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
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="friend-section">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Waiting</p>
              <h2>Sent requests</h2>
            </div>
            <span className="friend-count">{friendshipGroups.sent.length}</span>
          </div>

          {loading ? (
            <p className="empty-state">Loading sent requests...</p>
          ) : friendshipGroups.sent.length === 0 ? (
            <p className="empty-state">No sent requests waiting.</p>
          ) : (
            <ul className="friend-list compact-friend-list">
              {friendshipGroups.sent.map((friendship) => (
                <li key={friendship.id}>
                  {renderPersonMeta(friendship, "Request sent.")}
                  <span className="status-pill pending">Pending</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}

export default Friends;
