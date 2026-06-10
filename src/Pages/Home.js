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
    description: "Find resources for practicing and leading Steadfast in worship.",
    path: "/steadfast",
    image: "/steadfast-banner.png",
    imageAlt: "Steadfast logo",
  },
  {
    title: "Worthy for Song",
    description: "Worthy for Song, Lord willing, will be my first and upcoming album!",
    path: "/worthy-for-song",
  },
  {
    title: "VBS 2026, Kinder Music",
    description: "Charts and practice resources for the Kinder music team.",
    path: "/vbs-2026-kinder-music",
    image: "/vbs-2026-god-of-light.png",
    imageAlt: "VBS 2026 God of Light artwork",
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
          My name is Derek Smith and I hope to provide a place to find chord charts, tutorials, articles, and practical help for
          serving the local church in worship ministry
        </p>
      </section>

      {/* The cards are created by looping over homeSections with map(). */}
      <section className="resource-grid" aria-label="Worship resource sections">
        {homeSections.map((section) => (
          // key helps React track each card efficiently.
          <Link className="resource-card" key={section.title} to={section.path}>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
            {section.image && (
              <img
                className="resource-card-image"
                src={section.image}
                alt={section.imageAlt}
              />
            )}
            <span>Open section</span>
          </Link>
        ))}
      </section>
    </main>
  );
}

export default Home;
