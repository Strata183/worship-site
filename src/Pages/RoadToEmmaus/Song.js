import { Link, useParams } from "react-router-dom";
import roadToEmmausTracks from "../../Data/roadToEmmausTracks";
import StreamingLinks from "./StreamingLinks";

function RoadToEmmausSong() {
  const { trackSlug } = useParams();
  const track = roadToEmmausTracks.find((song) => song.slug === trackSlug);

  if (!track) {
    return (
      <main className="page page-road-to-emmaus emmaus-song-page">
        <Link className="emmaus-back-link" to="/road-to-emmaus">
          <span aria-hidden="true">←</span> Road to Emmaus album
        </Link>
        <section className="emmaus-song-content">
          <p className="eyebrow">Road to Emmaus</p>
          <h1>Song not found</h1>
          <p>That song page isn’t available. Return to the album to see its tracks.</p>
        </section>
      </main>
    );
  }

  const isReleased = track.status === "released";

  return (
    <main className="page page-road-to-emmaus emmaus-song-page">
      <Link className="emmaus-back-link" to="/road-to-emmaus">
        <span aria-hidden="true">←</span> Road to Emmaus album
      </Link>

      <section className="emmaus-song-content" aria-labelledby="emmaus-song-title">
        <p className="eyebrow">Road to Emmaus · Single</p>
        <h1 id="emmaus-song-title">{track.title}</h1>
        <span className={`emmaus-release-status${isReleased ? " is-released" : ""}`}>
          {isReleased ? "Out now" : "Coming soon"}
        </span>
        <p className="emmaus-song-description">{track.description}</p>
        <StreamingLinks
          spotifyUrl={track.spotifyUrl}
          youtubeMusicUrl={track.youtubeMusicUrl}
          appleMusicUrl={track.appleMusicUrl}
        />
      </section>
    </main>
  );
}

export default RoadToEmmausSong;
