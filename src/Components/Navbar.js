import { NavLink } from "react-router-dom";

function Navbar() {
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
      </div>
    </nav>
  );
}

export default Navbar;
