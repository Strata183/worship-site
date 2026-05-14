import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav>
      <div className="nav-content">
        <h2>Worship Hub</h2>

        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>

          <li>
            <Link to="/songs">Songs</Link>
          </li>

          <li>
            <Link to="/tutorials">Tutorials</Link>
          </li>
          <li>
            <Link to="/articles">Articles</Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
