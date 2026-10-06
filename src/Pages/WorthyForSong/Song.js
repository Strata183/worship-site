import { Link, useParams } from "react-router-dom";
import worthyForSongTracks from "../../Data/worthyForSongTracks";
import StreamingLinks from "../RoadToEmmaus/StreamingLinks";

function WorthyForSongTrackPage() {
  const { trackSlug } = useParams();
  const trackIndex = worthyForSongTracks.findIndex(
    (song) => song.slug === trackSlug
  );
  const track = worthyForSongTracks[trackIndex];

  if (!track) {
    return (
      <main className="page page-worthy-for-song worthy-song-page">
        <Link className="worthy-back-link" to="/worthy-for-song">
          <span aria-hidden="true">←</span> Worthy for Song album
        </Link>
        <section className="worthy-song-content">
          <p className="eyebrow">Worthy for Song</p>
          <h1>Song not found</h1>
          <p>That song page isn’t available. Return to the album to see its tracks.</p>
        </section>
      </main>
    );
  }

  const isReleased = track.status === "released";

  return (
    <main className="page page-worthy-for-song worthy-song-page">
      <Link className="worthy-back-link" to="/worthy-for-song">
        <span aria-hidden="true">←</span> Worthy for Song album
      </Link>

      <section className="worthy-song-content" aria-labelledby="worthy-song-title">
        <img
          className="worthy-song-art"
          src="/worthy_for_song.png"
          alt="Worthy for Song album artwork"
        />
        <p className="eyebrow">
          Worthy for Song · Track {String(trackIndex + 1).padStart(2, "0")}
        </p>
        <h1 id="worthy-song-title">{track.title}</h1>
        <span className={`worthy-release-status${isReleased ? " is-released" : ""}`}>
          {isReleased ? "Out now" : "Coming soon"}
        </span>
        <p className="worthy-song-description">{track.description}</p>
        <StreamingLinks
          spotifyUrl={track.spotifyUrl}
          youtubeMusicUrl={track.youtubeMusicUrl}
          appleMusicUrl={track.appleMusicUrl}
        />
      </section>
    </main>
  );
}

export default WorthyForSongTrackPage;
