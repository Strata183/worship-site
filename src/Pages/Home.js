import { Link } from "react-router-dom";

// This array is the data for the cards on the home page.
// Keeping the card information here makes the JSX below shorter.
const homeSections = [
  {
    title: "Start with Songs",
    description: "Find chord charts, keys, and song resources for worship sets.",
    path: "/songs",
  },
  {
    title: "Steadfast",
    description: "Find resources for practicing and leading Steadfast.",
    path: "/steadfast",
  },
  {
    title: "Worthy for Song",
    description: "Worthy for Song, Lord willing, will be my first and upcoming album!",
    path: "/worthy-for-song",
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

// Home is the landing page visitors see at "/".
function Home() {
  return (
    <main className="page page-home">
      {/* Hero section: the main welcome area at the top of the page. */}
      <section className="home-hero">
        <img
          className="home-hero-image"
          src="/newguitar.png"
          alt="Black acoustic guitar"
        />
        <h1>Welcome to Worthy for Worship</h1>
        <p>
          Find chord charts, tutorials, articles, and practical help for
          serving worship teams with love and clarity.
        </p>
      </section>

      {/* The cards are created by looping over homeSections with map(). */}
      <section className="resource-grid" aria-label="Worship resource sections">
        {homeSections.map((section) => (
          // key helps React track each card efficiently.
          <Link className="resource-card" key={section.title} to={section.path}>
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
