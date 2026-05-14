import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div>
          <h2>Worthy for Worship</h2>
          <p>Free worship resources for serving the local church with care.</p>
        </div>

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
    </footer>
  );
}

export default Footer;
