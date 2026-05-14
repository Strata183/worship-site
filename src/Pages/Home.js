import { Link } from "react-router-dom";

const homeSections = [
  {
    title: "Start with Songs",
    description: "Find chord charts, keys, and song resources for worship sets.",
    path: "/songs",
  },
  {
    title: "Learn with Tutorials",
    description: "Practice with walkthroughs made for growing worship leaders.",
    path: "/tutorials",
  },
  {
    title: "Read Articles",
    description: "Explore thoughts on biblical worship and serving the church.",
    path: "/articles",
  },
  {
    title: "About Worthy for Worship",
    description: "Learn why this resource exists and who it is meant to serve.",
    path: "/about",
  },
];

function Home() {
  return (
    <main className="page page-home">
      <section className="home-hero">
        <p className="eyebrow">Free worship resources for the local church</p>
        <h1>Welcome to Worthy for Worship</h1>
        <p>
          Find chord charts, tutorials, articles, and practical help for
          serving worship teams with love and clarity.
        </p>
      </section>

      <section className="resource-grid" aria-label="Worship resource sections">
        {homeSections.map((section) => (
          <Link className="resource-card" key={section.path} to={section.path}>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
            <span>Open section</span>
          </Link>
        ))}
      </section>
    </main>
  );
}

export default Home;
