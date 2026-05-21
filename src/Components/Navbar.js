import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";

// Navbar appears at the top of every page.
// It changes depending on whether the visitor is signed in.
function Navbar() {
  const { user } = useAuth();

  // Supabase clears the saved session, which causes AuthContext to update.
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
            {/* /songs is protected, so signed-out visitors will be sent to login. */}
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
            // Signed-in users see the account icon and dropdown.
            <div className="account-menu">
              <button
                aria-label="Account menu"
                className="account-button"
                type="button"
              >
                <span aria-hidden="true" className="account-icon" />
              </button>
              <div className="account-dropdown">
                {/* Friends lets users share access to songs with accepted friends. */}
                <NavLink to="/friends">Friends</NavLink>
                <button type="button" onClick={handleSignOut}>
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            // Signed-out visitors see a link to the login/sign-up page.
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
