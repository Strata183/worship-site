// About is a simple informational page.
// It does not need state, effects, or database calls.
function About() {
  return (
    <main className="page page-about">
      <section className="about-hero">
        <h1>About Worthy for Worship</h1>
        <p>
          Worthy for Worship exists to serve the local church providing
          a place for worship leaders and musicians to share resources
          and to understand what Worship truly is
          so they can effectively apply their gifts to the glory of God.
        </p>
      </section>

      <section className="about-content">
        <p className="verse-ref">
          "Whether, then, you eat or drink or whatever you do, do all to the
          glory of God."
          <span>1 Corinthians 10:31</span>
        </p>

        <section className="about-section">
          <h2>Created To Worship</h2>
          <p>
            The title, "Worthy for Worship," describes the heart behind this
            site. We are all created for the purpose of worship. One specific
            way we worship is through music, and this site exists to support
            that work with practical tools for the church.
          </p>
        </section>

        <section className="about-section">
          <h2>Why This Site?</h2>
          <p>
            I do not mean to take away from the many excellent worship resources
            that already exist. However, many are built for a broad category of
            people from different churches with different needs.
          </p>
          <p>
            Worthy for Worship is focused on the local church and individual
            worship leaders and musicians who want an easy way to share music
            with others.
          </p>
          <p>
            I am building this site originally for my own church and team. 
            Nevertheless I hope it can be an encouragment to others in the 
            universal church as well!
          </p>
        </section>

        <section className="about-section about-closing">
          <h2>Built For Sharing</h2>
          <p>
            Each account is free and comes with a personal library of songs that
            can only be shared through friend requests. It is up to you to
            create faithful, helpful charts, but I pray this site can make those
            charts easier to share with your team as you grow in serving the
            church through music.
          </p>
        </section>
      </section>
    </main>
  );
}

export default About;
