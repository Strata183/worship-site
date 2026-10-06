import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import articles from "../Data/articles";
import roadToEmmausTracks from "../Data/roadToEmmausTracks";
import worthyForSongTracks from "../Data/worthyForSongTracks";

const sitePages = [
  { title: "Home", description: "Welcome to Worthy for Worship", path: "/" },
  { title: "Songs", description: "Chord charts, keys, and song resources", path: "/songs" },
  { title: "Resources", description: "Browse worship resources", path: "/resources" },
  { title: "Tutorials", description: "Practice walkthroughs and teaching resources", path: "/tutorials" },
  { title: "Prayer Guide", description: "Guidance for prayer", path: "/prayer" },
  { title: "Master's Bible Study", description: "Weekly study songs, notes, and prayer requests", path: "/masters-bible-study" },
  { title: "Steadfast", description: "Worship team practice resources", path: "/steadfast" },
  { title: "Worthy for Song", description: "Album, singles, and track pages", path: "/worthy-for-song" },
  { title: "Road to Emmaus", description: "Album story and songs", path: "/road-to-emmaus" },
  { title: "Contributors", description: "Road to Emmaus album contributors", path: "/road-to-emmaus/contributors" },
  { title: "About", description: "About Worthy for Worship", path: "/about" },
];

const searchableItems = [
  ...sitePages,
  ...articles.map((article) => ({
    title: article.name,
    description: article.description,
    path: `/articles/${article.slug}`,
  })),
  ...worthyForSongTracks.map((track) => ({
    title: track.title,
    description: `Worthy for Song track ${track.status === "released" ? "out now" : "coming soon"}`,
    path: `/worthy-for-song/${track.slug}`,
  })),
  ...roadToEmmausTracks.map((track) => ({
    title: track.title,
    description: `Road to Emmaus track ${track.status === "released" ? "out now" : "coming soon"}`,
    path: `/road-to-emmaus/${track.slug}`,
  })),
];

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 5 5" />
    </svg>
  );
}

function SiteSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return searchableItems
      .filter((item) =>
        `${item.title} ${item.description}`.toLocaleLowerCase().includes(normalizedQuery)
      )
      .slice(0, 7);
  }, [query]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!searchRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleSubmit(event) {
    event.preventDefault();

    if (results[0]) {
      navigate(results[0].path);
      setIsOpen(false);
      setQuery("");
    }
  }

  function handleResultClick() {
    setIsOpen(false);
    setQuery("");
  }

  return (
    <div className="site-search" ref={searchRef}>
      <button
        aria-controls="site-search-panel"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close search" : "Open search"}
        className="site-search-toggle"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <SearchIcon />
      </button>

      {isOpen && (
        <div className="site-search-panel" id="site-search-panel">
          <form onSubmit={handleSubmit} role="search">
            <label className="site-search-label" htmlFor="site-search-input">
              Search pages and songs
            </label>
            <div className="site-search-field">
              <input
                autoFocus
                id="site-search-input"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try a page or song title"
                type="search"
                value={query}
              />
              <button aria-label="Search" type="submit">
                <SearchIcon />
              </button>
            </div>
          </form>

          {query.trim() && (
            results.length ? (
              <ul className="site-search-results">
                {results.map((item) => (
                  <li key={`${item.path}-${item.title}`}>
                    <Link onClick={handleResultClick} to={item.path}>
                      <strong>{item.title}</strong>
                      <small>{item.description}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="site-search-empty">No matching pages or songs.</p>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default SiteSearch;
