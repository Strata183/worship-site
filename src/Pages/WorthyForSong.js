import { Link } from "react-router-dom";
import worthyForSongTracks from "../Data/worthyForSongTracks";
import StreamingLinks from "./RoadToEmmaus/StreamingLinks";

function WorthyForSong() {
  const featuredSingle = worthyForSongTracks.find(
    (track) => track.status === "released" && track.featured
  );

  return (
    <main className="page page-worthy-for-song">
      <Link className="worthy-back-link" to="/">
        <span aria-hidden="true">←</span> Worthy for Worship
      </Link>

      <section className="worthy-album-hero">
        <div className="worthy-artwork-column">
          <img
            className="worthy-album-art"
            src="/worthy_for_song.png"
            alt="Worthy for Song album artwork showing an acoustic guitar by a mountain lake"
          />
          <StreamingLinks />
        </div>

        <div className="worthy-album-copy">
          <p className="eyebrow">An upcoming album</p>
          <h1>Worthy for Song</h1>
          <p className="worthy-album-subtitle">
            A solo album project with covers and singles.
          </p>
          <p>
            Lord willing, this will be my first album. More about the songs and
            the heart behind the project will be shared here soon.
          </p>
        </div>
      </section>

      {featuredSingle && (
        <section className="worthy-featured-single" aria-label="Latest single">
          <div>
            <p className="eyebrow">Latest single</p>
            <h2>{featuredSingle.title}</h2>
          </div>
          <Link to={`/worthy-for-song/${featuredSingle.slug}`}>
            Listen to the single <span aria-hidden="true">→</span>
          </Link>
        </section>
      )}

      <section className="worthy-description" aria-labelledby="worthy-description-title">
        <p className="eyebrow">About the album</p>
        <h2 id="worthy-description-title">Songs for the journey</h2>
        <p>
          This album is a work in progress. The track pages will grow with the
          stories, thoughts, and listening links for each song as they become
          available.
        </p>
      </section>

      <section className="worthy-track-panel" aria-labelledby="worthy-tracks-title">
        <p className="eyebrow">The songs</p>
        <h2 id="worthy-tracks-title">Singles &amp; album tracks</h2>
        <ol className="worthy-track-list">
          {worthyForSongTracks.map((track) => (
            <li key={track.slug}>
              <Link className="worthy-track-link" to={`/worthy-for-song/${track.slug}`}>
                <span>{track.title}</span>
                <span className="worthy-track-status">
                  {track.status === "released" ? "Out now" : "Coming soon"}
                </span>
                <span aria-hidden="true" className="worthy-track-arrow">→</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

export default WorthyForSong;
