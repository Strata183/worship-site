import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";

function Navbar() {
  const { user } = useAuth();

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <nav>
      <div className="nav-content">
        <NavLink className="site-title" to="/" end>
          Worthy for Worship
        </NavLink>

        <ul>
          <li>
            <NavLink to="/songs">Songs</NavLink>
          </li>

          <li>
            <NavLink to="/tutorials">Tutorials</NavLink>
          </li>
          <li>
            <NavLink to="/articles">Articles</NavLink>
          </li>

          <li>
            <NavLink to="/about">About</NavLink>
          </li>
        </ul>

        <div className="account-nav">
          {user ? (
            <div className="account-menu">
              <button
                aria-label="Account menu"
                className="account-button"
                type="button"
              >
                <span aria-hidden="true" className="account-icon" />
              </button>
              <div className="account-dropdown">
                <NavLink to="/friends">Friends</NavLink>
                <button type="button" onClick={handleSignOut}>
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <NavLink className="login-link" to="/login">
              Login
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
