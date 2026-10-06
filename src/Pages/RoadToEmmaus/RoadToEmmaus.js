import { Link } from "react-router-dom";
import roadToEmmausTracks from "../../Data/roadToEmmausTracks";
import StreamingLinks from "./StreamingLinks";

function RoadToEmmaus() {
  const featuredSingle = roadToEmmausTracks.find(
    (track) => track.status === "released" && track.featured
  );

  return (
    <main className="page page-road-to-emmaus">
      <Link className="emmaus-back-link" to="/">
        <span aria-hidden="true">←</span> Worthy for Worship
      </Link>

      <section className="emmaus-hero">
        <div className="emmaus-artwork-column">
          <figure className="emmaus-artwork">
            <img
              src="/road-to-emmaus-art.png"
              alt="Sunset over a desert highway and distant mountains"
            />
          </figure>
          <StreamingLinks />
        </div>

        <div className="emmaus-intro">
          <p className="eyebrow">An upcoming album</p>
          <h1>Road to Emmaus</h1>
          <p className="emmaus-subtitle">Declaring the eye opening truths of Jesus revealed through His Word</p>
          <p>
            A worship album being created with some friends.
            More about the heart behind the album will
            be shared here soon.
          </p>
          
            <Link className="emmaus-status" to="/road-to-emmaus/contributors">
            Contributors
            </Link>
    
        </div>
      </section>

      {featuredSingle && (
        <section className="emmaus-featured-single" aria-label="Latest single">
          <div>
            <p className="eyebrow">Latest single</p>
            <h2>{featuredSingle.title}</h2>
          </div>
          <Link to={`/road-to-emmaus/${featuredSingle.slug}`}>
            Listen to the single <span aria-hidden="true">→</span>
          </Link>
        </section>
      )}

      <section className="emmaus-story" aria-labelledby="emmaus-story-title">
        <h2 id="emmaus-story-title">Description</h2>
        <p>
          The title points to the road to Emmaus in Luke 24, where two disciples
          walked with Jesus. He reveals Himself to them through all the scriptures
          as they are perplexed and astonished by the events around them surrounding 
          Jesus' resurrection. This album is a mix of worship, depravity, 
          surrender, journey, and the overall walk of the Christian as they grow in
          faith and see their savior to a greater degree. 
        </p>
      </section>

      <section className="emmaus-tracks" aria-labelledby="emmaus-tracks-title">
        <p className="eyebrow">The songs</p>
        <h2 id="emmaus-tracks-title">Singles &amp; album tracks</h2>
        <ol className="emmaus-track-list">
          {roadToEmmausTracks.map((track) => (
            <li key={track.title}>
              <Link className="emmaus-track-link" to={`/road-to-emmaus/${track.slug}`}>
                <span>{track.title}</span>
                <span className="emmaus-track-status">
                  {track.status === "released" ? "Out now" : "Coming soon"}
                </span>
                <span aria-hidden="true" className="emmaus-track-arrow">→</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

export default RoadToEmmaus;
