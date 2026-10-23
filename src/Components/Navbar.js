import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";
import SiteSearch from "./SiteSearch";

// Navbar appears at the top of every page.
// It changes depending on whether the visitor is signed in.
function Navbar() {
  const { user } = useAuth();
  const [accountDropdownDismissed, setAccountDropdownDismissed] = useState(false);

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
            <NavLink to="/resources">Resources</NavLink>
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
          <SiteSearch />
          {user ? (
            // The picture opens Profile, and the existing dropdown keeps its account actions.
            <div
              className={`account-menu${accountDropdownDismissed ? " is-dismissed" : ""}`}
              onMouseLeave={() => setAccountDropdownDismissed(false)}
            >
              <Link
                aria-label="Profile"
                className="account-button"
                onClick={() => setAccountDropdownDismissed(true)}
                to="/profile"
              >
                <span aria-hidden="true" className="account-icon" />
              </Link>
              <div className="account-dropdown">
                <NavLink to="/friends">Friends</NavLink>
                <button onClick={handleSignOut} type="button">
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
