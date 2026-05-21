import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

// ProtectedRoute is a wrapper for pages that should only be visible after login.
// It receives a page as "children" and either shows it or redirects to /login.
function ProtectedRoute({ children }) {
  const { loading, user } = useAuth();

  // location remembers which protected page the visitor wanted.
  // Login can use it to send them back after they sign in.
  const location = useLocation();

  if (loading) {
    return (
      <main className="page">
        <p>Loading your library...</p>
      </main>
    );
  }

  if (!user) {
    // replace keeps the browser history cleaner.
    // state={{ from: location }} tells Login where to return after success.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If a user exists, show the protected page.
  return children;
}

export default ProtectedRoute;
