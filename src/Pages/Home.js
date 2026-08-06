import { Link } from "react-router-dom";

const donationUrl =
  process.env.REACT_APP_DONATION_URL || "https://ko-fi.com/dereksmith183";

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
    image: "/worthy_for_song.png",
    imageAlt: "Worthy for Song artwork",
    imageClassName: "resource-card-image-crop",
  },
  {
    title: "VBS 2026, Kinder Music",
    description: "Charts and practice resources for the Kinder music team.",
    path: "/vbs-2026-kinder-music",
    image: "/vbs-2026-god-of-light.png",
    imageAlt: "VBS 2026 God of Light artwork",
    imageClassName: "resource-card-image-crop",
  },
  // THIS IS A CARD FOR TUTORIALS THAT I WILL ADD BACK LATER. RIGHT NOW I DON'T HAVE TUTORIALS SO I DON'T NEED THIS CARD
  // {
  //   title: "Learn with Tutorials",   
  //   description: "Practice with walkthroughs made for growing worship leaders.",
  //   path: "/tutorials",
  // },
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
  {
    title: "Prayer Guide",
    description: "Here is a helpful resource to guide your prayer time with the Lord.",
    path: "/prayer",
    image: "/prayer-bible.png",
    imageAlt: "Prayer Image",
    imageClassName: "resource-card-image-crop",
  },
  {
    title: "Support Worthy for Worship",
    description: "Give a tip through Ko-fi to help support this resource.",
    externalUrl: donationUrl,
    actionLabel: donationUrl ? "Donate on Ko-fi" : "Donation link coming soon",
  }
  
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
        <h2 className="home-hero-statement">
          Worship is that which is distinctly and only for God, and which,
          while capturing the most profound of our emotions, does so by the
          most profound divine truth
        </h2>
        <p>
          My name is Derek Smith and this is my personal website! I hope to provide a place to find chord charts, tutorials, articles, and practical help for
          serving the local church in worship ministry
        </p>
      </section>

      {/* The cards are created by looping over homeSections with map(). */}
      <section className="resource-grid" aria-label="Worship resource sections">
        {homeSections.map((section) => {
          const cardContent = (
            <>
              <h2>{section.title}</h2>
              <p>{section.description}</p>
              {section.image && (
                <img
                  className={`resource-card-image ${section.imageClassName || ""}`}
                  src={section.image}
                  alt={section.imageAlt}
                />
              )}
              <span>{section.actionLabel || "Open section"}</span>
            </>
          );

          if (section.externalUrl) {
            return (
              <a
                className="resource-card"
                href={section.externalUrl}
                key={section.title}
                rel="noopener noreferrer"
                target="_blank"
              >
                {cardContent}
              </a>
            );
          }

          if (!section.path) {
            return (
              <div
                aria-disabled="true"
                className="resource-card resource-card-disabled"
                key={section.title}
              >
                {cardContent}
              </div>
            );
          }

          // key helps React track each card efficiently.
          return (
            <Link className="resource-card" key={section.title} to={section.path}>
              {cardContent}
            </Link>
          );
        })}
      </section>

    </main>
  );
}

export default Home;
