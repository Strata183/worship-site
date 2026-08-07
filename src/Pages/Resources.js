import { Link } from "react-router-dom";

const resourceGroups = [
  {
    title: "Core Resources",
    description: "The main places to start when looking for worship resources.",
    links: [
      {
        title: "Songs",
        description: "Chord charts, keys, and song resources for worship sets.",
        path: "/songs",
      },
      {
        title: "Articles",
        description: "Thoughts on biblical worship and serving the local church.",
        path: "/articles",
      },
      {
        title: "Prayer Guide",
        description: "A practical guide for focused prayer time.",
        path: "/prayer",
      },
      {
        title: "Master's Bible Study",
        description: "Weekly songs, prayer requests, and study notes.",
        path: "/masters-bible-study",
      },
    ],
  },
  {
    title: "Projects",
    description: "Specific music projects and team resource pages.",
    links: [
      {
        title: "Steadfast",
        description: "Practice resources for leading Steadfast in worship.",
        path: "/steadfast",
      },
      {
        title: "Worthy for Song",
        description: "Information and track notes for the upcoming album.",
        path: "/worthy-for-song",
      },
      {
        title: "VBS 2026, Kinder Music",
        description: "Charts and practice resources for the Kinder music team.",
        path: "/vbs-2026-kinder-music",
      },
    ],
  },
  {
    title: "Site Information",
    description: "Helpful pages about the purpose of Worthy for Worship.",
    links: [
      {
        title: "About",
        description: "Learn why this resource exists and who it is meant to serve.",
        path: "/about",
      },
      {
        title: "Tutorials",
        description: "Practice walkthroughs and teaching resources.",
        path: "/tutorials",
      },
    ],
  },
];

function Resources() {
  return (
    <main className="page page-resources">
      <section className="page-heading resources-heading">
        <p className="eyebrow">Resources</p>
        <h1>Find a Page</h1>
        <p>
          A simple index of the main sections on Worthy for Worship, gathered in
          one place.
        </p>
      </section>

      <section className="resources-groups" aria-label="Resource sections">
        {resourceGroups.map((group) => (
          <section className="resources-group" key={group.title}>
            <div className="resources-group-heading">
              <h2>{group.title}</h2>
              <p>{group.description}</p>
            </div>

            <div className="resources-link-grid">
              {group.links.map((link) => (
                <Link className="resources-link-card" key={link.path} to={link.path}>
                  <h3>{link.title}</h3>
                  <p>{link.description}</p>
                  <span>Open page</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}

export default Resources;
