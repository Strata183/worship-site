import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav>
      <div className="nav-content">
        <Link className="site-title" to="/">
          Worthy for Worship
        </Link>

        <ul>
          <li>
            <Link to="/songs">Songs</Link>
          </li>

          <li>
            <Link to="/tutorials">Tutorials</Link>
          </li>
          <li>
            <Link to="/articles">Articles</Link>
          </li>

          <li>
            <Link to="/about">About</Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
