import { Link } from "react-router-dom";
import worshipNightArchive from "../Data/worshipNightArchive";

function WorshipNightArchive() {
  return (
    <main className="page page-worship-night worship-night-archive-page">
      <Link className="worship-night-back-link" to="/worship-night">
        <span aria-hidden="true">←</span> Worship Night
      </Link>

      <header className="worship-night-archive-header">
        <h1>Past Worship Nights</h1>
        <p>Browse recaps, photos, videos, and favorite moments from each night.</p>
      </header>

      {worshipNightArchive.length ? (
        <div className="worship-night-archive-list">
          {worshipNightArchive.map((night) => (
            <article className="worship-night-archive-card" key={night.slug}>
              <div className="worship-night-archive-card-heading">
                <div>
                  <p className="eyebrow">{night.date}</p>
                  <h2>{night.title}</h2>
                </div>
                {night.location && <span>{night.location}</span>}
              </div>
              <p className="worship-night-archive-recap">{night.recap}</p>
              {night.media?.length > 0 && (
                <div className="worship-night-gallery">
                  {night.media.map((media) => media.type === "video" ? (
                    <video controls key={media.src} preload="metadata" src={media.src} />
                  ) : (
                    <img alt={media.alt} key={media.src} src={media.src} />
                  ))}
                </div>
              )}
              {night.songs?.length > 0 && (
                <div className="worship-night-archive-songs">
                  <h3>Songs we sang</h3>
                  <ul>{night.songs.map((song) => <li key={song}>{song}</li>)}</ul>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <section className="worship-night-archive-empty">
          <h2>The first gathering is coming up</h2>
          <p>After Worship Night, this page will become a dated collection of recaps, photos, videos, and songs.</p>
          <Link className="worship-night-archive-link" to="/worship-night">
            See the next Worship Night <span aria-hidden="true">→</span>
          </Link>
        </section>
      )}
    </main>
  );
}

export default WorshipNightArchive;
