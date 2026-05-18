import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

function ProtectedRoute({ children }) {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="page">
        <p>Loading your library...</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;
