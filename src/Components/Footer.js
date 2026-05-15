import { Link } from "react-router-dom";

// ...existing code...
function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div>
          <h2>Worthy for Worship</h2>
          <p>Free worship resources for serving the local church.</p>
        </div>

        <ul>
          <li><Link to="/songs">Songs</Link></li>
          <li><Link to="/tutorials">Tutorials</Link></li>
          <li><Link to="/articles">Articles</Link></li>
          <li><Link to="/about">About</Link></li>
        </ul>
      </div>

      <div className="footer-legal">
        <small>© Copyright {new Date().getFullYear()} Worthy for Worship. All rights reserved.</small>
      </div>
    </footer>
  );
}
// ...existing code...
export default Footer;
