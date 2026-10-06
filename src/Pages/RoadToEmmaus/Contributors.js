import { Link } from "react-router-dom";

function RoadToEmmausContributors() {
  return (
    <main className="page page-road-to-emmaus emmaus-contributors">
      <Link className="emmaus-back-link" to="/road-to-emmaus">
        <span aria-hidden="true">←</span> Road to Emmaus
      </Link>

      <section className="emmaus-story" aria-labelledby="emmaus-contributors-title">
        <p className="eyebrow">Road to Emmaus</p>
        <h1 id="emmaus-contributors-title">Contributors</h1>
        <p>
          The people helping bring this album to life will be introduced here.
          Check back soon for names and credits.
        </p>
      </section>
    </main>
  );
}

export default RoadToEmmausContributors;
