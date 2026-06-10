import { Link } from "react-router-dom";

// Steadfast is a group-specific resource page.
function Steadfast() {
  return (
    <main className="page page-steadfast">
      <section className="steadfast-hero">
        <p className="eyebrow">Steadfast</p>
        <h1>Welcome, Steadfast!</h1>
        <p>
          Thank you for making your way to this new website as I continue
          developing it for the local church.
        </p>
      </section>

      <section className="steadfast-content" aria-label="Steadfast resources">
        <section className="steadfast-section">
          <h2>Start here</h2>
          <p>
            If you have not already, go ahead and check out the{" "}
            <Link to="/about">About</Link> section, where I explain the point
            of this website and what I am trying to accomplish in more depth.
          </p>
          <p>
            Long story short, my desire is that the local church would be more
            united in song choices and, ultimately, in proper worship.
          </p>
          <p>
            This page is specifically for Steadfast, so it will make the most
            sense if you are part of the Steadfast fellowship group at Grace
            Community Church.
          </p>
        </section>

        <section className="steadfast-section steadfast-callout">
          <h2>Helpful prerequisites for service</h2>
          <p>
            If you serve with me, I would love for us to be united around a few
            prerequisites since we will be facilitating and leading worship.
            These are simply resources; they are not what make someone eligible
            to serve. My goal is unity.
          </p>
          <p>
            To start, please take some time to read{" "}
            <Link to="/articles/what-is-worship">What is worship?</Link>
          </p>
          <p>
            If we are going to lead worship, it is only fair that we know what
            worship is.
          </p>
        </section>
      </section>
    </main>
  );
}

export default Steadfast;
